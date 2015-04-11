#ifndef INCLUDE_HTTPCLIENT_H_
#define INCLUDE_HTTPCLIENT_H_

#include "user_interface.h"
#include "espconn.h"

typedef void (*httpRequestCallback)(bool success, uint16_t statusCode, uint8_t *data, uint16_t length);

struct espconn* ICACHE_FLASH_ATTR httpGetConnection();

void ICACHE_FLASH_ATTR httpRequest(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path,
		const char* verb,
		const char* contentType,
		const void* data, uint32_t length);

void ICACHE_FLASH_ATTR httpGet(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path_fmt, ...);

void ICACHE_FLASH_ATTR httpPost(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path,
		const char* contentType,
		const void* data, uint32_t length);

void ICACHE_FLASH_ATTR httpPostJson(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path,
		const char *fmt, ...);

#endif /* INCLUDE_HTTPCLIENT_H_ */
