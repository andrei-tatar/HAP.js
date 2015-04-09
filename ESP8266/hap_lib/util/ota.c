/*
 * ota.c
 *
 *  Created on: Feb 20, 2015
 *      Author: X550L-User1
 */

#include "httpclient.h"
#include "ota.h"
#include "upgrade.h"
#include "mem.h"
#include "osapi.h"
#include "upgrade.h"

static otaCallbackHandler otaFinishedCallback;
static const char* ota_type = "undefined";
static const char* ota_server = NULL;
static uint16_t ota_major = 0, ota_minor = 0;

static void ICACHE_FLASH_ATTR handle_callback(bool success)
{
	if (otaFinishedCallback)
	{
		otaFinishedCallback(success);
		otaFinishedCallback = NULL;
	}
}

static void ICACHE_FLASH_ATTR ota_finished_callback(void *arg)
{
	struct upgrade_server_info *update = arg;
	if(update->upgrade_flag == true)
	{
		handle_callback(true);
		ets_uart_printf("OTA: success; rebooting!\r\n");
		system_upgrade_reboot();
	}
	else
	{
		handle_callback(false);
		ets_uart_printf("OTA: failed!\r\n");
	}

	os_free(update->pespconn);
	os_free(update->url);
	os_free(update);
}

void ICACHE_FLASH_ATTR ota_request_callback(bool success, uint16_t statusCode, uint8_t *data, uint16_t length)
{
	if (success && statusCode == 200 && data &&
		length > 0)
	{
		const char* file;
		uint8_t userBin = system_upgrade_userbin_check();
		switch (userBin)
		{
		case UPGRADE_FW_BIN1: file = "user2.bin"; break;
		case UPGRADE_FW_BIN2: file = "user1.bin"; break;
		default:
			ets_uart_printf("OTA: Invalid userbin number!\r\n");
			handle_callback(false);
			return;
		}

		struct upgrade_server_info* update = (struct upgrade_server_info *)os_zalloc(sizeof(struct upgrade_server_info));
		os_memcpy(update->upgrade_version, data, length);
		update->upgrade_version[length] = 0;
		os_sprintf(update->pre_version, "%d.%d", ota_major, ota_minor);

		ets_uart_printf("OTA: Installed-%s, Server-%s\r\n", update->pre_version, update->upgrade_version);
		if (strcmp(update->upgrade_version, update->pre_version) == 0)
		{
			ets_uart_printf("OTA: Latest version!\r\n");
			os_free(update);
			handle_callback(false);
			return;
		}

		update->pespconn = (struct espconn *)os_zalloc(sizeof(struct espconn));
		os_memcpy(update->ip, httpGetConnection()->proto.tcp->remote_ip, 4);
		update->port = httpGetConnection()->proto.tcp->remote_port;

		update->check_cb = ota_finished_callback;
		update->check_times = 5000;
		update->url = (uint8 *)os_zalloc(512);

		os_sprintf(update->url,
		        "GET /update/get/%s/%s HTTP/1.1\r\n"
				"Host: %s\r\n"
				"Connection: keep-alive\r\n"
				"Cache-Control: no-cache\r\n"
				"Accept: */*\r\n"
				"Accept-Encoding: gzip,deflate,sdch\r\n"
				"Accept-Language: zh-CN,zh;q=0.8\r\n\r\n",
				ota_type, file, ota_server);

		if (system_upgrade_start(update) == false)
		{
			ets_uart_printf("OTA: Could not start upgrade\r\n");

			os_free(update->pespconn);
			os_free(update->url);
			os_free(update);

			handle_callback(false);
		}
		else
		{
			ets_uart_printf("OTA: Upgrading...\r\n");
		}
	}
	else
	{
		ets_uart_printf("OTA: Could not check for fw upgrades\r\n");
		handle_callback(false);
	}
}

void ICACHE_FLASH_ATTR ota_upgrade(otaCallbackHandler callback)
{
    otaFinishedCallback = callback;

    if (ota_server == NULL)
    {
        handle_callback(false);
        return;
    }

	ets_uart_printf("OTA: Checking for fw upgrades\r\n");
	httpGet(ota_request_callback, "http://%s/update/latest/%s", ota_server, ota_type);
}

void ICACHE_FLASH_ATTR ota_set_server(const char* updateServer, uint16_t port)
{
    if (ota_server == NULL)
    {
        static char static_ota_server[30];
        ota_server = static_ota_server;
    }
    os_sprintf(ota_server, "%s:%d", updateServer, port);
}

void ICACHE_FLASH_ATTR ota_init(const char* type, uint16_t majorVersion, uint16_t minorVersion)
{
	ota_type = type;
	ota_major = majorVersion;
	ota_minor = minorVersion;
}

const char* ICACHE_FLASH_ATTR ota_get_type()
{
    return ota_type;
}
