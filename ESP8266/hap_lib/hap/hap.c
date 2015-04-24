/*
 * hap.c
 *
 *  Created on: Apr 15, 2015
 *      Author: Andrei
 */

#include "osapi.h"
#include "user_interface.h"
#include "espconn.h"
#include "util.h"
#include "hap.h"
#include "mqtt/mqtt.h"
#include "settings.h"
#include "mem.h"

#include "httpd.h"
#include "config.h"
#include "upgrade.h"

#define UPGRADE_PREFIX  "/hap/upgrade/"

static MQTT_Client mqttClient;
static const char *node_type;
static uint16_t version;
static hapMqttCallback mqttConnected, mqttDisconnected, mqttPublished;
static hapMqttDataCallback mqttData;

static void ICACHE_FLASH_ATTR wifi_check_ip(void *arg)
{
    ETSTimer *timer = (ETSTimer*)arg;

    struct ip_info ipConfig;
    if (wifi_station_get_connect_status() == STATION_GOT_IP)
    {
        DEBUG_PRINT("[HAP]Connected to AP\n");
        os_timer_disarm(timer);
        return;
    }

    static uint8_t failedCheckTimes = 0;
    if (++failedCheckTimes >= 10)
    {
        DEBUG_PRINT("[HAP]Could not connect to AP. Setting AP mode\n");
        os_timer_disarm(timer);
        setup_wifi_ap_mode(settings.nodeName);
    }
}

static void ICACHE_FLASH_ATTR mqttConnectedCb(uint32_t *args)
{
    DEBUG_PRINT("[MQTT]Connected\n");
    MQTT_Client* client = (MQTT_Client*)args;

    char aux[50];
    os_sprintf(aux, UPGRADE_PREFIX"%s", node_type);
    MQTT_Subscribe(client, aux, 0);

    if (mqttConnected) mqttConnected(client);
}

static void ICACHE_FLASH_ATTR mqttDisconnectedCb(uint32_t *args)
{
    MQTT_Client* client = (MQTT_Client*)args;
    DEBUG_PRINT("[MQTT]Disconnected\n");
    if (mqttDisconnected) mqttDisconnected(client);
}

static void ICACHE_FLASH_ATTR mqttPublishedCb(uint32_t *args)
{
    MQTT_Client* client = (MQTT_Client*)args;
    DEBUG_PRINT("[MQTT]Published\n");
    if (mqttPublished) mqttPublished(client);
}

static void ICACHE_FLASH_ATTR ota_finished_callback(void *arg)
{
    struct upgrade_server_info *update = arg;
    if (update->upgrade_flag == true)
    {
         DEBUG_PRINT("[OTA]success; rebooting!\n");
        system_upgrade_reboot();
    }
    else
    {
        DEBUG_PRINT("[OTA]failed!\n");
    }

    os_free(update->pespconn);
    os_free(update->url);
    os_free(update);
}

static void ICACHE_FLASH_ATTR handleUpgrade(const char *data, uint32_t data_len)
{
    const char* file;
    uint8_t userBin = system_upgrade_userbin_check();
    switch (userBin)
    {
    case UPGRADE_FW_BIN1: file = "user2.bin"; break;
    case UPGRADE_FW_BIN2: file = "user1.bin"; break;
    default:
        DEBUG_PRINT("[OTA]Invalid userbin number!\n");
        return;
    }

    //data should contain a string in the following format:
    //version\0port\0path\0
    uint16_t serverVersion = atoi(data);
    if (serverVersion <= version)
    {
        DEBUG_PRINT("[OTA]No update. Server version:%d, local version %d\n", serverVersion, version);
        return;
    }

    while (*data) data++;data++;

    DEBUG_PRINT("[OTA]Upgrade available version: %d\n", serverVersion, data);

    struct upgrade_server_info* update = (struct upgrade_server_info *)os_zalloc(sizeof(struct upgrade_server_info));
    update->pespconn = (struct espconn *)os_zalloc(sizeof(struct espconn));
    os_memcpy(update->ip, mqttClient.pCon->proto.tcp->remote_ip, 4);
    update->port = atoi(data);
    while (*data) data++;data++;

    DEBUG_PRINT("[OTA]Server "IPSTR":%d. Path: %s%s\n", IP2STR(update->ip), update->port, data, file);

    update->check_cb = ota_finished_callback;
    update->check_times = 10000;
    update->url = (uint8 *)os_zalloc(512);

    os_sprintf(update->url,
            "GET %s%s HTTP/1.1\r\n"
            "Host: "IPSTR":%d\r\n"
            "Connection: close\r\n"
            "\r\n",
            data, file, IP2STR(update->ip), update->port);

    if (system_upgrade_start(update) == false)
    {
        ets_uart_printf("[OTA]Could not start upgrade\n");

        os_free(update->pespconn);
        os_free(update->url);
        os_free(update);
    }
    else
    {
        ets_uart_printf("[OTA]Upgrading...\n");
    }
}

static void ICACHE_FLASH_ATTR mqttDataCb(uint32_t *args, const char* topic, uint32_t topic_len, const char *data, uint32_t data_len)
{
    char *topicBuf = (char*)os_zalloc(topic_len+1);
    MQTT_Client* client = (MQTT_Client*)args;

    os_memcpy(topicBuf, topic, topic_len);
    topicBuf[topic_len] = 0;

    if (strncmp(topicBuf, UPGRADE_PREFIX, strlen(UPGRADE_PREFIX)) == 0 && data_len > 5)
    {
        DEBUG_PRINT("[MQTT]Upgrade data received\n");
        handleUpgrade(data, data_len);
        return;
    }

    DEBUG_PRINT("[MQTT]Data on topic: %s, length: %d\n", topicBuf, data_len);

    if (mqttData) mqttData(client, topicBuf, data, data_len);
    os_free(topicBuf);
}

static void ICACHE_FLASH_ATTR udp_received(void *arg, char *data, unsigned short len)
{
    struct espconn *udpconn= (struct espconn*)arg;
    if (len > 5 && strncmp(data, "HAP", 3) == 0)
    {
        const char* hapServer = &data[5];
        if (strcmp(settings.serverName, hapServer) != 0)
            return;

        static uint16_t hapPort;
        static uint32_t hapAddress = 0;

        uint16_t port = (data[3] << 8) | data[4];
        uint32_t address = *(uint32_t*)udpconn->proto.udp->remote_ip;

        if (port == hapPort && address == hapAddress)
            return;

        hapAddress = address;
        hapPort = port;

        static bool inited = false;

        DEBUG_PRINT("[HAP]Discover from "IPSTR":%d\n", IP2STR(&address), port);

        if (inited)
        {
            MQTT_Disconnect(&mqttClient);
            DEBUG_PRINT("[HAP]Disconnect MQTT\n");
        }

        DEBUG_PRINT("[HAP]Initializing MQTT\n");

        char aux[20];
        os_sprintf(aux, IPSTR, IP2STR(&address));
        MQTT_InitConnection(&mqttClient, aux, hapPort);
        MQTT_InitClient(&mqttClient, settings.nodeName, settings.hapUserName, settings.hapPassword, MQTT_KEEPALIVE, 1);
        MQTT_OnConnected(&mqttClient, mqttConnectedCb);
        MQTT_OnDisconnected(&mqttClient, mqttDisconnectedCb);
        MQTT_OnPublished(&mqttClient, mqttPublishedCb);
        MQTT_OnData(&mqttClient, mqttDataCb);
        MQTT_Connect(&mqttClient);

        inited = true;
    }
}

static void ICACHE_FLASH_ATTR udp_init()
{
    static struct espconn udpServer;
    static esp_udp udp;
    udpServer.type = ESPCONN_UDP;
    udpServer.state = ESPCONN_NONE;
    udpServer.proto.udp = &udp;
    udpServer.proto.udp->local_port = settings.udpPort;

    if (espconn_create(&udpServer) == 0)
    {
        espconn_regist_recvcb(&udpServer, udp_received);
        DEBUG_PRINT("[HAP]Started UDP server\n");
    }
}


bool ICACHE_FLASH_ATTR index_httpd_request(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length);

bool ICACHE_FLASH_ATTR hap_init(const char* type, uint16_t pVersion)
{
    node_type = type;
    version = pVersion;

    settings_load();
    httpd_register(index_httpd_request);

    bool result;

    if (!settings_valid())
    {
        DEBUG_PRINT("[HAP]Settings not valid, using defaults, starting AP\n");

        settings.password[0] = 0;
        settings.ssid[0] = 0;

        strcpy(settings.serverName, "hap_server");
        strcpy(settings.hapUserName, "user");
        strcpy(settings.hapPassword, "pass");
        settings.udpPort = 5112;
        os_sprintf(settings.nodeName, "hap_%d", system_get_chip_id());
        result = setup_wifi_ap_mode(settings.nodeName);
    }
    else
    {
        DEBUG_PRINT("[HAP]Settings valid, connecting to AP %s\n", settings.ssid);

        static ETSTimer timer;
        os_timer_disarm(&timer);
        os_timer_setfn(&timer, (os_timer_func_t *)wifi_check_ip, &timer);
        os_timer_arm(&timer, 1000, 1);

        udp_init();
        result = setup_wifi_st_mode(settings.ssid, settings.password);
    }

    if (result) httpd_init(80);

    return result;
}

void ICACHE_FLASH_ATTR hap_setConnectedCb(hapMqttCallback callback)         { mqttConnected = callback; }
void ICACHE_FLASH_ATTR hap_setDisconnectedCb(hapMqttCallback callback)      { mqttDisconnected = callback; }
void ICACHE_FLASH_ATTR hap_setPublishedCb(hapMqttCallback callback)         { mqttPublished = callback; }
void ICACHE_FLASH_ATTR hap_setDataReceivedCb(hapMqttDataCallback callback)  { mqttData = callback; }
