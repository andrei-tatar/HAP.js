#include "osapi.h"
#include "user_interface.h"

#include "httpd.h"
#include "util.h"

#include "uart.h"
#include "i2c.h"
#include "user_config.h"
#include "gpio.h"
#include "http.h"

static uint16_t pulses[70];
static uint8_t pos = 0;
static bool first = true;
static ETSTimer timer;

#define IR_LED_INIT    {PIN_FUNC_SELECT(PERIPHS_IO_MUX_MTMS_U, FUNC_GPIO14);GPIO_OUTPUT_SET(14, 0);}
#define IR_LED(x)      GPIO_OUTPUT_SET(14, x)

static ICACHE_FLASH_ATTR void send_pulses(uint16_t *pulses, uint8_t length)
{
    os_intr_lock();
    uint8_t i;
    uint32_t end = system_get_time();
    for (i=0; i<length; i++)
    {
        end += pulses[i];
        if (i % 2 == 0)
        {
            // @ 38 kHz
            uint32_t now;
            do
            {
                now = system_get_time();
                IR_LED((now / 13) % 2);
            } while (now < end);
            IR_LED(0);
        }
        else
        {
            //just wait for pulse length
            while (system_get_time() < end);
        }
    }
    os_intr_unlock();
}

static ICACHE_FLASH_ATTR bool httpd_onrequest(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length)
{
    ets_uart_printf("%d %s\n", verb, path);

    if (strcasecmp(path, "/ir") != 0 || verb != HTTPD_VERB_POST)
        return false;

    char *ptr = data;
    if (*ptr++ == '[')
    {
        ETS_GPIO_INTR_DISABLE();
        pos = 0;
        while (pos < sizeof(pulses))
        {
            pulses[pos++] = atou16(&ptr);
            char next = *ptr++;
            if (next == ']')
                break;
        }

        send_pulses(pulses, pos);

        pos = 0;first = true;
        ETS_GPIO_INTR_ENABLE();
        httpd_send_text(slot, 200, "OK");
    }
    else
        httpd_send_text(slot, 400, "Expected an array of numbers");

    return true;
}

static void on_timeout(void *arg)
{
    uint8_t i;

    if (pos)
    {
        char pulsesArray[360];
        char *dest = pulsesArray;
        for (i=0;i<pos;i++)
        {
            u16toa(pulses[i], &dest);
            if (i < pos-1) *dest++ = ',';
        }
        *dest = 0;

        char url[50];
        os_sprintf(url, "http://%s:%d/ir", hap_get_server(), hap_get_port());
        httpPostJson(NULL, url, "{\"pulses\":[%s],\"id\":%d}", pulsesArray, system_get_chip_id());
    }

    pos = 0;
    first = true;
}

static void ICACHE_FLASH_ATTR gpio_intr(void *arg)
{
    uint32_t gpio_status = GPIO_REG_READ(GPIO_STATUS_ADDRESS);
    GPIO_REG_WRITE(GPIO_STATUS_W1TC_ADDRESS, gpio_status);

    static uint32_t start = 0;
    uint32_t now = system_get_time();
    if (first)
        first = false;
    else
    {
        if (pos < sizeof(pulses))
            pulses[pos++] = now - start;
    }
    start = now;

    os_timer_disarm(&timer);
    os_timer_arm(&timer, 15, 0);
}

void ICACHE_FLASH_ATTR user_init()
{
    IR_LED_INIT;
	uart_init(BIT_RATE_115200);
	ota_init(OTA_TYPE, OTA_MAJOR, OTA_MINOR);

	hap_init();

	httpd_register(httpd_onrequest);
	httpd_init(80);

	ETS_GPIO_INTR_DISABLE();
	ETS_GPIO_INTR_ATTACH(gpio_intr, NULL);
	GPIO_DIS_OUTPUT(13);
	PIN_FUNC_SELECT(PERIPHS_IO_MUX_MTCK_U, FUNC_GPIO13);
	gpio_pin_intr_state_set(GPIO_ID_PIN(13), GPIO_PIN_INTR_ANYEDGE);
	ETS_GPIO_INTR_ENABLE();

    os_timer_disarm(&timer);
    os_timer_setfn(&timer, (os_timer_func_t *)on_timeout, &timer);
}
