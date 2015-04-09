/*
 * util.h
 *
 *  Created on: Mar 3, 2015
 *      Author: Andrei
 */

#ifndef INCLUDE_UTIL_H_
#define INCLUDE_UTIL_H_

bool ICACHE_FLASH_ATTR setup_wifi_st_mode(const char* ssid, const char* password);
bool ICACHE_FLASH_ATTR setup_wifi_ap_mode(const char* ssid);
bool ICACHE_FLASH_ATTR hap_init();

const char *hap_get_server();
const uint16_t hap_get_port();

void ICACHE_FLASH_ATTR u16toa(uint16_t nr, char** destPtr);
uint16_t ICACHE_FLASH_ATTR atou16(char** ptr);

#endif /* INCLUDE_UTIL_H_ */
