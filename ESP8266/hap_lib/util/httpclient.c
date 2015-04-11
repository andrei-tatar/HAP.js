#include <stdarg.h>
#include "osapi.h"
#include "http.h"
#include "httpclient.h"
#include "user_interface.h"
#include "espconn.h"

static bool inprogress = false;
static httpRequestCallback requestCallback;
static bool httpRequestResult;

#define BUF_SIZE	1024

static uint8_t buffer[BUF_SIZE];
static int bufferLength, dataLength, dataStart;
static int responseStatusCode;

static void ICACHE_FLASH_ATTR tcp_recon_cb(void *arg, sint8 err)
{
	if (inprogress) {
		inprogress = false;
		if (requestCallback)
			requestCallback(false, 0, NULL, 0);
	}
}

static void ICACHE_FLASH_ATTR tcp_sent_cb(void *arg)
{
	struct espconn *pespconn = arg;
	bufferLength = 0; //reset the length since we are going to receive
}

static void ICACHE_FLASH_ATTR tcp_received_cb(void *arg, char *pdata, unsigned short len)
{
	struct espconn *pespconn = arg;

	if (!httpRequestResult)
	{
		espconn_disconnect(pespconn);
		return;
	}

	if (bufferLength + len > BUF_SIZE)
	{
		httpRequestResult = false;
		espconn_disconnect(pespconn);
		return;
	}

	os_memcpy(&buffer[bufferLength], pdata, len);
	bufferLength += len;

	if (dataStart == -1)
	{
		char* aux = strstr(buffer, "\r\n\r\n");
		if (aux)
		{
			dataStart = aux + 4 - (char*)buffer;
			aux = strcasestr(buffer, "Content-Length");
			if (aux)
			{
				aux += 14;
				while (*aux < '0' || *aux > '9') aux++;
				dataLength = atoi(aux);

				aux = buffer;
				while (*aux != ' ') aux++;
				responseStatusCode = atoi(aux);
			}
			else
			{
				httpRequestResult = false;
				espconn_disconnect(pespconn);
				return;
			}
		}
	}

	//if all the sent data was received
	if (dataStart + dataLength == bufferLength)
	{
		espconn_disconnect(pespconn);
		return;
	}
}

static void ICACHE_FLASH_ATTR http_timeout_callback(void *arg)
{
    struct espconn *pespconn = arg;
    httpRequestResult = false;
    espconn_disconnect(pespconn);
}

static void ICACHE_FLASH_ATTR tcp_connect_cb(void *arg)
{
	struct espconn *pespconn = arg;
	sint8 espsent_status = espconn_sent(pespconn, buffer, bufferLength);
	dataStart = -1;
	dataLength = 0;
	httpRequestResult = espsent_status == ESPCONN_OK;

	//start timeout timer
	static ETSTimer timer;
    os_timer_disarm(&timer);
    os_timer_setfn(&timer, (os_timer_func_t *)http_timeout_callback, pespconn);
    os_timer_arm(&timer, CONNECTION_TIMEOUT, 0);
}

static void ICACHE_FLASH_ATTR tcp_discon_cb(void *arg)
{
	if (inprogress) {
		inprogress = false;
		if (requestCallback)
		{
			if (!httpRequestResult)
				requestCallback(false, 0, NULL, 0);
			else
				requestCallback(true, responseStatusCode, &buffer[dataStart], dataLength);
		}
	}
}

static void ICACHE_FLASH_ATTR httpInitConnection(struct espconn *connection, uint32_t ip, uint16_t port)
{
	connection->type = ESPCONN_TCP;
	connection->state = ESPCONN_NONE;
	os_memcpy(connection->proto.tcp->remote_ip, &ip, 4);
	connection->proto.tcp->local_port = espconn_port();
	connection->proto.tcp->remote_port = port;

	espconn_regist_connectcb(connection, tcp_connect_cb);
	espconn_regist_reconcb(connection, tcp_recon_cb);
	espconn_regist_disconcb(connection, tcp_discon_cb);
	espconn_regist_sentcb(connection, tcp_sent_cb);
	espconn_regist_recvcb(connection, tcp_received_cb);
}

static void ICACHE_FLASH_ATTR httpStartRequest(struct espconn *connection)
{
	//start TCP connection
	sint8 espcon_status = espconn_connect(connection);
	if (espcon_status != ESPCONN_OK)
	{
		inprogress = false;
		if (requestCallback) requestCallback(false, 0, NULL, 0);
	}
}

struct espconn* ICACHE_FLASH_ATTR httpGetConnection() {
	static esp_tcp connectionTcp;
	static struct espconn connection = {.proto={.tcp=&connectionTcp}};
	return &connection;
}

void ICACHE_FLASH_ATTR httpRequest(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path,
		const char* verb,
		const char* contentType,
		const void* data, uint32_t length)
{
	if (inprogress)
	{
		//invalid url or already a request in progress
		if (callback) callback(false, 0, NULL, 0);
		return;
	}

	inprogress = true;

	DEBUG_PRINT("[HTTPC]Requesting %s on "IPSTR":%d\n", path, IP2STR(&address), port);

	struct espconn *connection = httpGetConnection();
	bufferLength = os_sprintf(buffer,
		"%s %s HTTP/1.1\r\n"
		"Host: "IPSTR":%d\r\n"
		"Connection: close\r\n"
		"Content-Type: %s\r\n"
		"Content-Length: %d\r\n\r\n",
		verb, path, IP2STR(&address), port, contentType, length);

	if (data)
	{
		os_memcpy(&buffer[bufferLength], data, length);
		bufferLength += length;
	}

	requestCallback = callback;
    httpInitConnection(connection, address, port);
    httpStartRequest(connection);
}

void ICACHE_FLASH_ATTR httpGet(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path_fmt, ...)
{
	char url[128];

	va_list al;
	va_start(al, path_fmt);
	ets_vsnprintf(url, sizeof(url)-1, path_fmt, al);
	va_end(al);

	httpRequest(address, port, callback, url, verb_get, mime_textplain, NULL, 0);
}

void ICACHE_FLASH_ATTR httpPost(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char* path,
		const char* contentType,
		const void* data, uint32_t length)
{
	httpRequest(address, port, callback, path, verb_post, contentType, data, length);
}

void ICACHE_FLASH_ATTR httpPostJson(
        uint32_t address, uint16_t port,
		httpRequestCallback callback,
		const char *path,
		const char *fmt, ...)
{
	char buffer[512];

	va_list al;
	va_start(al, fmt);
	int length = ets_vsnprintf(buffer, sizeof(buffer)-1, fmt, al);
	va_end(al);

	httpPost(address, port, callback, path, mime_application_json, buffer, length);
}
