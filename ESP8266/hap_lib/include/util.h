/*
 * util.h
 *
 *  Created on: Mar 3, 2015
 *      Author: Andrei
 */

#ifndef INCLUDE_UTIL_H_
#define INCLUDE_UTIL_H_

#include <c_types.h>
#include "mqtt/mqtt.h"

bool ICACHE_FLASH_ATTR setup_wifi_st_mode(const char* ssid, const char* password);
bool ICACHE_FLASH_ATTR setup_wifi_ap_mode(const char* ssid);

void ICACHE_FLASH_ATTR u16toa(uint16_t nr, char** destPtr);
uint16_t ICACHE_FLASH_ATTR atou16(char** ptr);

#endif /* INCLUDE_UTIL_H_ */
