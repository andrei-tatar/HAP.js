/*
 * hap.h
 *
 *  Created on: Apr 15, 2015
 *      Author: Andrei
 */

#ifndef INCLUDE_HAP_H_
#define INCLUDE_HAP_H_

#include <c_types.h>
#include "mqtt/mqtt.h"
#include "config.h"

bool ICACHE_FLASH_ATTR hap_init(const char* type, uint16_t majorVersion, uint16_t minorVersion);

typedef void (*hapMqttCallback)(MQTT_Client *client);
typedef void (*hapMqttDataCallback)(MQTT_Client *client, const char* topic, const char *data, uint32_t len);

void ICACHE_FLASH_ATTR hap_setConnectedCb(hapMqttCallback callback);
void ICACHE_FLASH_ATTR hap_setDisconnectedCb(hapMqttCallback callback);
void ICACHE_FLASH_ATTR hap_setPublishedCb(hapMqttCallback callback);
void ICACHE_FLASH_ATTR hap_setDataReceivedCb(hapMqttDataCallback callback);

#endif /* INCLUDE_HAP_H_ */
