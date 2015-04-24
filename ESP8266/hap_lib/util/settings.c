/*
 * settings.c
 *
 *  Created on: Apr 15, 2015
 *      Author: Andrei
 */

#include "settings.h"
#include "spi_flash.h"

HapSettings settings;

#define ESP_PARAM_START_SEC     0x3C
#define ESP_PARAM_SETTINGS      0

void ICACHE_FLASH_ATTR settings_save()
{
    settings.magicNumber = MAGIC_NUMBER;

    spi_flash_erase_sector(ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS);
    spi_flash_write((ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS) * SPI_FLASH_SEC_SIZE,
            (uint32 *)&settings, sizeof(HapSettings));
}

void ICACHE_FLASH_ATTR settings_load()
{
    spi_flash_read((ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS) * SPI_FLASH_SEC_SIZE,
            (uint32 *)&settings, sizeof(HapSettings));
}

void ICACHE_FLASH_ATTR settings_clear()
{
    spi_flash_erase_sector(ESP_PARAM_START_SEC + ESP_PARAM_SETTINGS);
}

bool ICACHE_FLASH_ATTR settings_valid()
{
    return settings.magicNumber == MAGIC_NUMBER;
}
