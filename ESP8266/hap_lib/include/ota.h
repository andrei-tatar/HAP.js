/*
 * ota.h
 *
 *  Created on: Feb 20, 2015
 *      Author: X550L-User1
 */

#ifndef INCLUDE_OTA_H_
#define INCLUDE_OTA_H_

typedef void (*otaCallbackHandler)(bool success);

void ICACHE_FLASH_ATTR ota_upgrade(otaCallbackHandler callback);
void ICACHE_FLASH_ATTR ota_set_server(const char* updateServer, uint16_t port);
void ICACHE_FLASH_ATTR ota_init(
		const char* type,
		uint16_t majorVersion, uint16_t minorVersion);
const char* ICACHE_FLASH_ATTR ota_get_type();

#endif /* INCLUDE_OTA_H_ */
