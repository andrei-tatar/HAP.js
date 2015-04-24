#include "osapi.h"
#include "user_interface.h"
#include "espconn.h"

#include "uart.h"
#include "i2c.h"
#include "util.h"
#include "httpd.h"

#include "tcn75a.h"
#include "user_config.h"
#include "hap.h"
#include "mqtt/mqtt.h"

#define LED_INIT    PIN_FUNC_SELECT(PERIPHS_IO_MUX_MTCK_U, FUNC_GPIO13)
#define LED_ON      GPIO_OUTPUT_SET(13, 0)
#define LED_OFF     GPIO_OUTPUT_SET(13, 1)

static bool lastPublished = true;
static ETSTimer sendtimer;

static void send_temperature(void *arg)
{
    MQTT_Client *client = arg;
    char temperature[10];
    if (lastPublished && tcn_read(temperature))
    {
        lastPublished = false;
        MQTT_Publish(client, "/hap/temperature", temperature, os_strlen(temperature), 0, 0);
    }
}

static bool httpd_onrequest(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length)
{
    if (verb != HTTPD_VERB_GET)
        return false;

    if (strcasecmp(path, "/temperature") == 0)
    {
        char temperature[10];
        if (tcn_read(temperature))
            httpd_send_text(slot, 200, temperature);
        else
            httpd_send_text(slot, 500, "Could not read temperature");
    }
    else
        return false;

    return true;
}

void ICACHE_FLASH_ATTR onMqttConnected(MQTT_Client *client)
{
    send_temperature(client);
    os_timer_disarm(&sendtimer);
    os_timer_setfn(&sendtimer, (os_timer_func_t *)send_temperature, client);
    os_timer_arm(&sendtimer, SEND_PERIOD, 1);
}

void ICACHE_FLASH_ATTR onMqttPublished(MQTT_Client *client)
{
    lastPublished = true;
}

void user_init()
{
    LED_INIT;
    LED_OFF;

	uart_init(BIT_RATE_115200);
	i2c_init();
	tcn_init(0x48);

	hap_setConnectedCb(onMqttConnected);
	hap_setPublishedCb(onMqttPublished);

	httpd_register(httpd_onrequest);
	hap_init(OTA_TYPE, OTA_VERSION);
}
