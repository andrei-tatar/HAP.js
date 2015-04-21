#include "osapi.h"
#include "user_interface.h"

#include "httpd.h"
#include "util.h"

#include "uart.h"
#include "i2c.h"
#include "user_config.h"
#include "gpio.h"
#include "mqtt/mqtt.h"
#include "settings.h"
#include "hap.h"

#define MAX_PULSES      70

static uint16_t pulses[MAX_PULSES];
static uint8_t pos = 0;
static bool first = true;
static ETSTimer timer;
static MQTT_Client *client = NULL;

#define IR_LED(x) GPIO_OUTPUT_SET(IR_OUT_PIN, x)

static ICACHE_FLASH_ATTR void send_pulses(uint16_t *pulses, uint8_t length)
{
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
                IR_LED(1);os_delay_us(13);
                IR_LED(0);os_delay_us(13);
            } while (now < end);
        }
        else
        {
            //just wait for pulse length
            while (system_get_time() < end)
                asm volatile("nop");
        }
    }
}

static void ICACHE_FLASH_ATTR on_timeout(void *arg)
{
    uint8_t i;

    os_intr_lock();
    if (pos)
    {
        uint8_t pulsesData[MAX_PULSES * 2];
        uint8_t *dest = pulsesData;
        for (i=0;i<pos;i++)
        {
            uint16_t pulse = pulses[i];
            *dest++ = (pulse >> 8) & 0xFF;
            *dest++ = pulse & 0xFF;
        }
        os_intr_unlock();

        MQTT_Publish(client, "/hap/ir", pulsesData, pos * 2, 0, 0);
    }
    else
        os_intr_unlock();

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

static ICACHE_FLASH_ATTR void onMqttData(MQTT_Client *client, const char* topic, const char *data, uint32_t len)
{
    if (strncasecmp(topic, "/hap/ir", 7) != 0 || len % 2 != 0)
        return;

    ETS_INTR_LOCK();
    ETS_GPIO_INTR_DISABLE();

    len /= 2;
    pos = 0;
    while (pos < MAX_PULSES && len)
    {
        pulses[pos++] = (*data++ << 8) | *data++;
        len--;
    }

    send_pulses(pulses, pos);

    pos = 0;first = true;

    GPIO_REG_WRITE(GPIO_STATUS_W1TC_ADDRESS, GPIO_REG_READ(GPIO_STATUS_ADDRESS));
    ETS_GPIO_INTR_ENABLE();
    ETS_INTR_UNLOCK();
}

static void ICACHE_FLASH_ATTR onMqttConnected(MQTT_Client *c)
{
    client = c;
    char topicName[50];
    os_sprintf(topicName, "/hap/ir/%s", settings.nodeName);
    MQTT_Subscribe(client, topicName, 0);

    static bool firstConnected = true;
    if (!firstConnected) return;
    firstConnected = false;

    ETS_GPIO_INTR_DISABLE();
    ETS_GPIO_INTR_ATTACH(gpio_intr, NULL);
    gpio_pin_intr_state_set(GPIO_ID_PIN(IR_IN_PIN), GPIO_PIN_INTR_ANYEDGE);
    ETS_GPIO_INTR_ENABLE();
}

void ICACHE_FLASH_ATTR user_init()
{
	uart_init(BIT_RATE_115200);

	PIN_FUNC_SELECT(IR_IN_MUX, IR_IN_FUNC);
	GPIO_DIS_OUTPUT(IR_IN_PIN);

	PIN_FUNC_SELECT(IR_OUT_MUX, IR_OUT_FUNC);
	IR_LED(0);

    os_timer_disarm(&timer);
    os_timer_setfn(&timer, (os_timer_func_t *)on_timeout, &timer);

    hap_setConnectedCb(onMqttConnected);
    hap_setDataReceivedCb(onMqttData);
    hap_init(OTA_TYPE, OTA_MAJOR, OTA_MINOR);
}
