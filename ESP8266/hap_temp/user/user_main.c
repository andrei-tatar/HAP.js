#include "osapi.h"
#include "user_interface.h"
#include "espconn.h"

#include "uart.h"
#include "tcn75a.h"
#include "i2c.h"
#include "ota.h"
#include "util.h"
#include "httpclient.h"
#include "httpd.h"

#include "user_config.h"

#define LED_INIT    PIN_FUNC_SELECT(PERIPHS_IO_MUX_MTCK_U, FUNC_GPIO13)
#define LED_ON      GPIO_OUTPUT_SET(13, 0)
#define LED_OFF     GPIO_OUTPUT_SET(13, 1)

static void ota_callback(bool success)
{
    LED_OFF;
}

static void send_callback(bool success, uint16_t statusCode, uint8_t *data, uint16_t length)
{
    if (success)
        ota_upgrade(ota_callback);
    else
        LED_OFF;
}

static void send_temperature(void *arg)
{
	if (wifi_station_get_connect_status() != STATION_GOT_IP)
	    return;

    char temperature[10];
    if (tcn_read(temperature) && hap_get_server())
    {
        LED_ON;

        httpPostJson(hap_get_server(), hap_get_port(), send_callback, "/temperature", "{\"temperature\":%s,\"id\":%d}",
                temperature, system_get_chip_id());
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

void user_init()
{
    LED_INIT;
    LED_OFF;

	uart_init(BIT_RATE_115200);
	i2c_init();
	tcn_init(0x48);
	ota_init(OTA_TYPE, OTA_MAJOR, OTA_MINOR);

	hap_init();

	httpd_register(httpd_onrequest);
	httpd_init(80);

	static ETSTimer timer;
    os_timer_disarm(&timer);
    os_timer_setfn(&timer, (os_timer_func_t *)send_temperature, &timer);
    os_timer_arm(&timer, SEND_PERIOD, 1);
}
