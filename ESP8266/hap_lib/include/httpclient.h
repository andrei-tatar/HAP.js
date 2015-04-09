#ifndef INCLUDE_HTTPCLIENT_H_
#define INCLUDE_HTTPCLIENT_H_

#include "user_interface.h"
#include "espconn.h"

typedef void (*httpRequestCallback)(bool success, uint16_t statusCode, uint8_t *data, uint16_t length);

struct espconn* ICACHE_FLASH_ATTR httpGetConnection();

void ICACHE_FLASH_ATTR httpRequest(
		httpRequestCallback callback,
		const char* url,
		const char* verb,
		const char* contentType,
		const void* data, uint32_t length);

void ICACHE_FLASH_ATTR httpGet(
		httpRequestCallback callback,
		const char* url_fmt, ...);

void ICACHE_FLASH_ATTR httpPost(
		httpRequestCallback callback,
		const char* url,
		const char* contentType,
		const void* data, uint32_t length);

void ICACHE_FLASH_ATTR httpPostJson(
		httpRequestCallback callback,
		const char* url,
		const char *fmt, ...);

#endif /* INCLUDE_HTTPCLIENT_H_ */
