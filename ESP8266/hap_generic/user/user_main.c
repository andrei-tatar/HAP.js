#include "osapi.h"
#include "user_interface.h"

#include "httpd.h"
#include "util.h"

#include "uart.h"
#include "i2c.h"
#include "user_config.h"
#include "gpio.h"

void ICACHE_FLASH_ATTR user_init()
{
	uart_init(BIT_RATE_115200);
	ota_init(OTA_TYPE, OTA_MAJOR, OTA_MINOR);

	hap_init();

	httpd_init(80);
}
