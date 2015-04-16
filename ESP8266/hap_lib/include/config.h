/*
 * config.h
 *
 *  Created on: Apr 15, 2015
 *      Author: Andrei
 */

#ifndef INCLUDE_CONFIG_H_
#define INCLUDE_CONFIG_H_

// DEBUG *************************
#define DEBUG   1

#if DEBUG
#define DEBUG_PRINT ets_uart_printf
#else
#define DEBUG_PRINT
#endif

// MQTT *************************
#define MQTT_RECONNECT_TIMEOUT  5
#define MQTT_BUF_SIZE           1024
#define MQTT_KEEPALIVE          120

#define PROTOCOL_NAMEv31    /*MQTT version 3.1 compatible with Mosquitto v0.15*/
//PROTOCOL_NAMEv311         /*MQTT version 3.11 compatible with https://eclipse.org/paho/clients/testing/*/
#define INFO    DEBUG_PRINT

// I2C *************************
#define I2C_SLEEP_TIME 10

// SDA on GPIO14
#define I2C_SDA_MUX PERIPHS_IO_MUX_MTMS_U
#define I2C_SDA_FUNC FUNC_GPIO14
#define I2C_SDA_PIN 14

// SCK on GPIO12
#define I2C_SCK_MUX PERIPHS_IO_MUX_MTDI_U
#define I2C_SCK_FUNC FUNC_GPIO12
#define I2C_SCK_PIN 12

#endif /* INCLUDE_CONFIG_H_ */
