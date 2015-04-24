/*
 * tcn75a.h
 *
 *  Created on: Feb 16, 2015
 *      Author: X550L-User1
 */

#ifndef INCLUDE_DRIVER_TCN75A_H_
#define INCLUDE_DRIVER_TCN75A_H_

#include "i2c.h"

bool ICACHE_FLASH_ATTR tcn_read(char* buffer);
bool ICACHE_FLASH_ATTR tcn_init(uint8_t address);


#endif /* INCLUDE_DRIVER_TCN75A_H_ */
