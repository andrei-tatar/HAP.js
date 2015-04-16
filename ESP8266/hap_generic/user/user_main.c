#include "uart.h"
#include "user_config.h"
#include "hap.h"

void ICACHE_FLASH_ATTR user_init()
{
	uart_init(BIT_RATE_115200);
	hap_init(OTA_TYPE, OTA_MAJOR, OTA_MINOR);
}
