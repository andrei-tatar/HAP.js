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

bool ICACHE_FLASH_ATTR hap_init(const char* type, uint16_t majorVersion, uint16_t minorVersion);

extern void (*mqttConnected)(MQTT_Client *client);
extern void (*mqttDisconnected)(MQTT_Client *client);
extern void (*mqttPublished)(MQTT_Client *client);
extern void (*mqttData)(MQTT_Client *client, const char* topic, const char *data, uint32_t len);

#endif /* INCLUDE_HAP_H_ */
