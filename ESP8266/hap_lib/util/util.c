#include "osapi.h"
#include "user_interface.h"
#include "espconn.h"
#include "httpd.h"
#include "ota.h"

typedef struct {
#define MAGIC_NUMBER    0x48A4C0DE
    uint32_t magicNumber;

    char ssid[32];
    char password[64];
    char server[64];
    char friendlyName[32];
    uint16_t port;
    uint16_t udpPort;
} HapSettings __attribute__((aligned(4)));

static HapSettings settings;
static void urldecode2(char *dst, const char *src);

#define ESP_PARAM_START_SEC     0x3C
#define ESP_PARAM_SETTINGS      0

const char * config_index =
"<!doctype html><html lang='en'><head><title>HAP Configration</title></head>\
<body><h2>Config</h2>\
<form method='POST'>\
<input type='text' name='ssid' placeholder='SSID' value='%s' required/>\
<br/>\
<input type='text' name='password' placeholder='Password' value='%s' required/>\
<br/>\
<input type='text' name='server' placeholder='HAP Server' value='%s' required\
pattern='^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})$|^((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9]))$'/>\
<br/>\
<input type='text' name='port' placeholder='Port' value='%d' required\
pattern='^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$'/>\
<br/>\
<input type='text' name='friendly' placeholder='Friendly Name' value='%s' required/>\
<br/>\
<input type='text' name='udpport' placeholder='UDP Port' value='%d' required\
pattern='^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$'/>\
<br/>\
<input type='submit' value='Save'/>\
</form></body></html>";

static void ICACHE_FLASH_ATTR restart(void *arg)
{
    system_restart();
}

static bool ICACHE_FLASH_ATTR handleSettingsParameter(const char* key, const char* value)
{
    if (strcmp(key, "ssid") == 0)
    {
        if (strcmp(settings.ssid, value))
        {
            os_strcpy(settings.ssid, value);
            return true;
        }
    }
    else if (strcmp(key, "password") == 0)
    {
        if (strcmp(settings.password, value))
        {
            os_strcpy(settings.password, value);
            return true;
        }
    }
    else if (strcmp(key, "server") == 0)
    {
        if (strcmp(settings.server, value))
        {
            os_strcpy(settings.server, value);
            return true;
        }
    }
    else if (strcmp(key, "port") == 0)
    {
        int port = atoi(value);
        if (settings.port != port)
        {
            settings.port = port;
            return true;
        }
    }
    else if (strcmp(key, "udpport") == 0)
    {
        int port = atoi(value);
        if (settings.udpPort != port)
        {
            settings.udpPort = port;
            return true;
        }
    }
    else if (strcmp(key, "friendly") == 0)
    {
        if (strcmp(settings.friendlyName, value))
        {
            os_strcpy(settings.friendlyName, value);
            return true;
        }
    }

    return false;
}

static ICACHE_FLASH_ATTR saveSettings()
{
    settings.magicNumber = MAGIC_NUMBER;

    spi_flash_erase_sector(ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS);
    spi_flash_write((ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS) * SPI_FLASH_SEC_SIZE,
            (uint32 *)&settings, sizeof(HapSettings));
}

static bool ICACHE_FLASH_ATTR httpd_request(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length)
{
    if (verb == HTTPD_VERB_POST)
    {
        if (strcasecmp(path, "/") == 0)
        {
            uint8_t pos = 0;
            char *key = data, *value;
            char decoded[30];
            bool changed = false;
            while (true)
            {
                if (pos == length || data[pos] == '&')
                {
                    data[pos] = 0;
                    urldecode2(decoded, value);
                    changed |= handleSettingsParameter(key, decoded);
                    if (pos < length)
                        key = &data[++pos];
                    else
                        break;
                }
                else if (data[pos] == '=')
                {
                    data[pos] = 0;
                    value = &data[pos+1];
                }
                else
                    pos++;
            }

            if (changed)
            {
                ota_set_server(settings.server, settings.port);
                saveSettings();
                httpd_send_html(slot, 200, "Settings saved. Do a <a href='/reset'>reset</a> to apply them!");
            }
            else
            {
                httpd_send_text(slot, 200, "Settings did not change");
            }
        }
        else
            return false;

        return true;
    }

    if (strcasecmp(path, "/") == 0)
    {
        httpd_send_html(slot, 200, config_index,
                settings.ssid, settings.password,
                settings.server, settings.port,
                settings.friendlyName,
                settings.udpPort);
    }
    else if (strcasecmp(path, "/clear") == 0)
    {
        if (settings.magicNumber == MAGIC_NUMBER)
        {
            spi_flash_erase_sector(ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS);
            httpd_send_text(slot, 200, "Settings cleared");
        }
        else
        {
            httpd_send_text(slot, 200, "No valid settings to clear");
        }
    }
    else if (strcasecmp(path, "/id") == 0)
    {
        httpd_send_text(slot, 200, "%d", system_get_chip_id());
    }
    else if (strcasecmp(path, "/heap") == 0)
    {
        httpd_send_text(slot, 200, "%d", system_get_free_heap_size());
    }
    else if (strcasecmp(path, "/reset") == 0)
    {
        httpd_send_text(slot, 200, "Resetting in 1sec");
        static ETSTimer restarttimer;
        os_timer_disarm(&restarttimer);
        os_timer_setfn(&restarttimer, (os_timer_func_t *)restart, NULL);
        os_timer_arm(&restarttimer, 1000, 0);
    }
    else if (strcasecmp(path, "/sdk") == 0)
    {
        httpd_send_text(slot, 200, system_get_sdk_version());
    }
    else if (strcasecmp(path, "/upgrade") == 0)
    {
        httpd_send_text(slot, 200, "Checking. If newer version available, will upgrade and reboot.");
        ota_upgrade(NULL);
    }
    else if (strncasecmp(path, "/change/", 8) == 0)
    {
        path += 8;
        httpd_send_text(slot, 200, "Changing type to %s\nTrying to upgrade...", path);
        ota_init(path, 0, 0);
        ota_upgrade(NULL);
    }
    else if (strncasecmp(path, "/gpio/", 6) == 0)
    {
        httpd_send_text(slot, 200, "TODO");
    }
    else
    {
        return false;
    }

    return true;
}

bool ICACHE_FLASH_ATTR setup_wifi_ap_mode(const char* ssid)
{
	if (wifi_get_opmode() != SOFTAP_MODE)
	    wifi_set_opmode(SOFTAP_MODE);

    struct softap_config apConfig;
    wifi_softap_get_config(&apConfig);
    os_strcpy(apConfig.ssid, ssid);

    if (wifi_get_opmode() != SOFTAP_MODE)
        return false;

    apConfig.authmode = AUTH_OPEN;
    apConfig.channel = 7;
    apConfig.max_connection = 255;
    apConfig.ssid_hidden = 0;
    wifi_softap_set_config(&apConfig);

	return true;
}

bool ICACHE_FLASH_ATTR setup_wifi_st_mode(const char* ssid, const char* password)
{
	wifi_set_opmode(STATION_MODE);
	struct station_config stconfig;
	wifi_station_disconnect();
	wifi_station_dhcpc_stop();
	if(wifi_station_get_config(&stconfig))
	{
		ets_uart_printf("SSID: %s, PASS: %s\n", stconfig.ssid, stconfig.password);

		os_strcpy(stconfig.ssid, ssid);
		os_strcpy(stconfig.password, password);

		if(!wifi_station_set_config(&stconfig))
			return false;
	}

	wifi_station_connect();
	wifi_station_dhcpc_start();
	wifi_station_set_auto_connect(1);

	if (wifi_get_phy_mode() != PHY_MODE_11N)
		wifi_set_phy_mode(PHY_MODE_11N);
	if (!wifi_station_get_auto_connect())
		wifi_station_set_auto_connect(true);

	return true;
}

static void ICACHE_FLASH_ATTR wifi_check_ip(void *arg)
{
    ETSTimer *timer = (ETSTimer*)arg;

    struct ip_info ipConfig;
    if (wifi_station_get_connect_status() == STATION_GOT_IP)
    {
        os_timer_disarm(timer);
        return;
    }

    static uint8_t failedCheckTimes = 0;
    if (++failedCheckTimes >= 10)
    {
        os_timer_disarm(timer);
        setup_wifi_ap_mode(settings.friendlyName);
    }
}

static void ICACHE_FLASH_ATTR udp_received(void *arg, char *data, unsigned short len)
{
    struct espconn *udpconn= (struct espconn*)arg;
    if (len > 5 && strncmp(data, "HAP", 3) == 0)
    {
        uint16_t hapPort = (data[3] << 8) | data[4];
        const char* hapServer = &data[5];
        if (settings.port != hapPort || strcmp(settings.server, hapServer) != 0)
        {
            strcpy(settings.server, hapServer);
            settings.port = hapPort;
            ota_set_server(hapServer, settings.port);
            saveSettings();
        }

        char response[128];
        int length = os_sprintf(response, "%d:%s:%s", system_get_chip_id(), settings.friendlyName, ota_get_type());
        espconn_sent(udpconn, response, length);
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
        ets_uart_printf("Started UDP server\n");
    }
}

bool ICACHE_FLASH_ATTR hap_init()
{
	spi_flash_read((ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS) * SPI_FLASH_SEC_SIZE,
			(uint32 *)&settings, sizeof(HapSettings));

	httpd_register(httpd_request);

	if (settings.magicNumber != MAGIC_NUMBER)
	{
	    settings.password[0] = 0;
	    settings.ssid[0] = 0;
	    settings.server[0] = 0;
	    settings.port = 5111;
	    settings.udpPort = 5112;
		os_sprintf(settings.friendlyName, "hap_%d", system_get_chip_id());
		return setup_wifi_ap_mode(settings.friendlyName);
	}
	else
	{
	    static ETSTimer timer;
        os_timer_disarm(&timer);
        os_timer_setfn(&timer, (os_timer_func_t *)wifi_check_ip, &timer);
        os_timer_arm(&timer, 1000, 1);

	    ota_set_server(settings.server, settings.port);
	    udp_init();
		return setup_wifi_st_mode(settings.ssid, settings.password);
	}
}

const char * ICACHE_FLASH_ATTR hap_get_server()
{
    return settings.server;
}

const uint16_t ICACHE_FLASH_ATTR hap_get_port()
{
    return settings.port;
}

uint16_t ICACHE_FLASH_ATTR atou16(char** ptr)
{
    char *str = *ptr;

    uint16_t result = 0;
    while (*str >= '0' && *str <= '9')
    {
        result = result * 10 + *str++ - '0';
    }

    *ptr = str;

    return result;
}

void ICACHE_FLASH_ATTR u16toa(uint16_t nr, char** destPtr)
{
    char *dest = *destPtr;

    bool any = false;
    uint8_t aux = nr / 10000;
    if (aux) {*dest++ = aux + '0';any=true;}
    nr %= 10000;

    aux = nr / 1000;
    if (any || aux) {*dest++ = aux + '0';any=true;}
    nr %= 1000;

    aux = nr / 100;
    if (any || aux) {*dest++ = aux + '0';any=true;}
    nr %= 100;

    aux = nr / 10;
    if (any || aux) *dest++ = aux + '0';
    *dest++ = (nr % 10) + '0';

    *destPtr = dest;
}

static void ICACHE_FLASH_ATTR urldecode2(char *dst, const char *src)
{
    char a, b;
    while (*src)
    {
        if ((*src == '%') && ((a = src[1]) && (b = src[2])) &&
            (isxdigit(a) && isxdigit(b)))
        {
            if (a >= 'a')
                a -= 'a'-'A';
            if (a >= 'A')
                a -= ('A' - 10);
            else
                a -= '0';
            if (b >= 'a')
                b -= 'a'-'A';
            if (b >= 'A')
                b -= ('A' - 10);
            else
                b -= '0';
            *dst++ = 16*a+b;
            src+=3;
        }
        else
        {
            *dst++ = *src++;
        }
    }
    *dst = '\0';
}
