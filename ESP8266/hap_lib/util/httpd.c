#include <string.h>
#include <osapi.h>
#include <os_type.h>
#include <stdarg.h>
#include "httpd.h"
#include "config.h"

#define HTTPD_MAX_CONN          4
#define HTTPD_BUFFER_SIZE       2048
#define HTTPD_URI_SIZE          256

#define HTTPD_STATE_PARSEVERB   0 //Waiting for POST ... or GET ...
#define HTTPD_STATE_PARSEHDRS   1 //Processing headers
#define HTTPD_STATE_WAITPOST    2 //Waiting for post data
#define HTTPD_STATE_READY       3 //HTTP request was parsed completely and is ready for handling.
#define HTTPD_STATE_RESPONDING  4 //Done, no more data should be processed

#define KEEP_ALIVE_TIMEOUT  30000
#define CONNECTION_TIMEOUT  3000

const char* verb_get = "GET";
const char* verb_post = "POST";

const char* mime_textplain = "text/plain";
const char* mime_texthtml = "text/html";
const char* mime_application_json = "application/json";

struct HttpdConnectionSlot {
	struct espconn *conn;
	ETSTimer timer;

	uint8_t state;
	uint8_t buffer[HTTPD_BUFFER_SIZE];
	uint16_t bufferLen;
	uint8_t verb;
	char uri[HTTPD_URI_SIZE];
	uint16_t contentLen;
};

static struct HttpdConnectionSlot httpd_conns[HTTPD_MAX_CONN];

static struct HttpdConnectionSlot * ICACHE_FLASH_ATTR httpd_find_slot(struct espconn *conn) {
	unsigned int i;
	for (i=0; i<HTTPD_MAX_CONN; i++) {
		if (httpd_conns[i].conn == conn) {
			return &httpd_conns[i];
		}
	}
	return NULL;
}

static struct HttpdConnectionSlot * ICACHE_FLASH_ATTR httpd_find_free_slot() {
	return httpd_find_slot(NULL);
}

void ICACHE_FLASH_ATTR httpd_send(struct HttpdConnectionSlot *slot, uint16_t code, const char *contentType, const void *data, int length)
{
	const char* codemessage;
	switch (code) {
	case 200: codemessage="OK"; break;
	case 400: codemessage="Bad Request"; break;
	case 404: codemessage="Not found"; break;
	case 405: codemessage="Method Not Allowed"; break;
	case 414: codemessage="Request-URI Too Long"; break;
	case 500: codemessage="Internal Server Error"; break;
	}

	slot->bufferLen = os_sprintf(slot->buffer,
			"HTTP/1.1 %d %s\r\n"
			"Content-Type: %s\r\n"
			"Content-Length: %d\r\n"
			"\r\n",
			code, codemessage, contentType, length);
	os_memcpy(&slot->buffer[slot->bufferLen], data, length);
	slot->bufferLen += length;

	espconn_sent(slot->conn, slot->buffer, slot->bufferLen);
}

void ICACHE_FLASH_ATTR httpd_send_html(struct HttpdConnectionSlot *slot, uint16_t code, const char *fmt, ...)
{
    char buffer[2048];

    va_list al;
    va_start(al, fmt);
    int length = ets_vsnprintf(buffer, sizeof(buffer)-1, fmt, al);
    va_end(al);

    httpd_send(slot, code, mime_texthtml, buffer, length);
}

void ICACHE_FLASH_ATTR httpd_send_text(struct HttpdConnectionSlot *slot, uint16_t code, const char *fmt, ...)
{
    char buffer[2048];

    va_list al;
    va_start(al, fmt);
    int length = ets_vsnprintf(buffer, sizeof(buffer)-1, fmt, al);
    va_end(al);

    httpd_send(slot, code, mime_textplain, buffer, length);
}

static void ICACHE_FLASH_ATTR httpd_process_verb(struct HttpdConnectionSlot *slot, uint8_t *line, uint16_t len) {
	uint16_t spaces[4];
	uint16_t numspaces=0;
	uint16_t i;
	for (i=0; i<len && numspaces<3; i++) {
		if (line[i] == ' ') {
			spaces[numspaces]=i;
			numspaces++;
		}
	}
	//Set final space (not counted in numspaces) to length of line, to ease calculation.
	spaces[numspaces]=len;
	if (numspaces < 2) {
		httpd_send_text(slot, 400, "Invalid number of parts to VERB");
		return;
	}
	//Parse actual verb
	if (spaces[0] == 3 && memcmp(line, verb_get, 3)==0) {
		slot->verb = HTTPD_VERB_GET;
	} else if (spaces[0] == 4 && memcmp(line, verb_post, 4)==0) {
		slot->verb = HTTPD_VERB_POST;
	} else {
		httpd_send_text(slot, 400, "Invalid verb");
		return;
	}
	//Parse URL
	uint16_t urilen = spaces[1] - (spaces[0]+1);
	if (urilen + 1 > HTTPD_URI_SIZE) {
		httpd_send_text(slot, 414, "Request-URI Too Long");
		return;
	}
	memcpy(slot->uri, &line[spaces[0]+1], urilen);
	slot->uri[urilen]='\0';
	//Parse headers now :)
	slot->state = HTTPD_STATE_PARSEHDRS;
}

static void ICACHE_FLASH_ATTR httpd_process_header(struct HttpdConnectionSlot *slot, uint8_t *line, uint16_t len) {
	if (len == 0) {
		if (slot->verb == HTTPD_VERB_POST && slot->contentLen > HTTPD_BUFFER_SIZE) httpd_send_text(slot,400,"Too much post data");
		else if (slot->verb == HTTPD_VERB_POST && slot->contentLen > 0) slot->state = HTTPD_STATE_WAITPOST;
		else slot->state = HTTPD_STATE_READY;
		return;
	}
	uint16_t split;
	for (split=0; split<len && line[split]!=':'; split++);
	if (split == len) {
		//Not sure what to do with this, error?
		return;
	}
	line[split]='\0';
	uint16_t valuestart = split+1;
	if (valuestart < len && line[valuestart]==' ') valuestart++;

	if (strncasecmp(line, "Content-Length", 14) == 0) {
		slot->contentLen=atoi(&line[valuestart]);
	}
}

//Returns how much data was removed
static void ICACHE_FLASH_ATTR httpd_process_buffer(struct HttpdConnectionSlot *slot) {
    bool anyDataProcessed;
    uint16_t endline;

	do
	{
	    anyDataProcessed = false;

		switch (slot->state)
		{
		case HTTPD_STATE_RESPONDING:
			return; //Don't bother doing anything else, buffer now contains an error message, socket should be closed ASAP.

		case HTTPD_STATE_PARSEVERB:
		case HTTPD_STATE_PARSEHDRS:
			for (endline=0; endline < slot->bufferLen && slot->buffer[endline] != '\n'; endline++);
			if (endline == slot->bufferLen)
			    break;
            //Mark as processed
            uint16_t processed = endline+1;
            //If the final character is a linefeed, ignore it.
            if (endline>0 && slot->buffer[endline-1]=='\r') endline--;
            //Overwrite newline or linefeed with \0 so we can use string functions inside header parsing.
            slot->buffer[endline]='\0';
            //Process verb or header
            if (slot->state == HTTPD_STATE_PARSEVERB)
                httpd_process_verb(slot, slot->buffer, endline);
            else
                httpd_process_header(slot, slot->buffer, endline);

            //Discard all processed data
            if (processed > 0)
            {
                slot->bufferLen -= processed;
                memcpy(slot->buffer, &slot->buffer[processed], slot->bufferLen);
                processed = 0;
                anyDataProcessed = true;
            }
			break;
		case HTTPD_STATE_WAITPOST:
			//Do we have enough data for the post request?
			if (slot->bufferLen >= slot->contentLen)
			{
				//If so, signal that we are ready to handle this request.
				slot->state = HTTPD_STATE_READY;
			}
			break;
		}
	} while (anyDataProcessed);
}

static httpd_request_callback request_callbacks[10];
static uint8_t request_callbacks_length = 0;

void ICACHE_FLASH_ATTR httpd_register(httpd_request_callback request_callback)
{
    request_callbacks[request_callbacks_length++] = request_callback;
}

static void ICACHE_FLASH_ATTR httpd_onrequest(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length)
{
    int8_t i = request_callbacks_length;
    while (--i >= 0)
        if (request_callbacks[i](slot, verb, path, data, length))
            return;

    httpd_send_text(slot, 404, "Not found");
}

static void ICACHE_FLASH_ATTR httpd_recv_callback(void *arg, char *pdata, unsigned short len) {
	struct HttpdConnectionSlot *slot = httpd_find_slot((struct espconn *)arg);
	if (slot == NULL) {
		espconn_disconnect((struct espconn *)arg);
		return;
	}

	DEBUG_PRINT("[HTTPD]Data received\n");

	uint16_t copy;
	while (len > 0 && slot->state != HTTPD_STATE_READY && slot->state != HTTPD_STATE_RESPONDING) {
		copy = HTTPD_BUFFER_SIZE - slot->bufferLen;
		if (copy == 0) {
			httpd_send_text(slot,400,"Buffer overflow");
			break;
		}
		if (copy > len) copy = len;
		memcpy(&slot->buffer[slot->bufferLen], pdata, copy);
		slot->bufferLen+=copy;
		pdata+=copy;
		len-=copy;
		httpd_process_buffer(slot);
	}
	if (slot->state == HTTPD_STATE_READY) {
		slot->state = HTTPD_STATE_RESPONDING;
		httpd_onrequest(slot, slot->verb, slot->uri, slot->buffer, slot->contentLen);
	}
}

static void ICACHE_FLASH_ATTR httpd_timeout_callback(void *arg) {
    struct HttpdConnectionSlot *slot = (struct HttpdConnectionSlot*)arg;

    if (slot->conn->state != ESPCONN_NONE && slot->conn->state != ESPCONN_CLOSE)
        espconn_disconnect(slot->conn);
    slot->conn = NULL;

    DEBUG_PRINT("[HTTPD]Timeout. Disconnect!\n");
}

static void ICACHE_FLASH_ATTR httpd_sent_callback(void *arg) {
	struct HttpdConnectionSlot *slot = httpd_find_slot((struct espconn *)arg);
	if (slot == NULL) {
		espconn_disconnect((struct espconn *)arg);
		return;
	}
	if (slot->state == HTTPD_STATE_RESPONDING) {
        //we've sent the response, reset connection so we can handle the next request

        //reset the timer
        os_timer_disarm(&slot->timer);
        os_timer_setfn(&slot->timer, (os_timer_func_t *)httpd_timeout_callback, slot);
        os_timer_arm(&slot->timer, KEEP_ALIVE_TIMEOUT, 0);

        //reset the connection
        slot->bufferLen = 0;
        slot->state = HTTPD_STATE_PARSEVERB;
        slot->contentLen = 0;

        DEBUG_PRINT("[HTTPD]Data sent!\n");
	}
}

static void ICACHE_FLASH_ATTR httpd_disconnect_callback(void *arg) {
	//arg is wrong, so we need to manually loop over all slots.
	unsigned int i;
	for (i=0; i<HTTPD_MAX_CONN; i++) {
		if (httpd_conns[i].conn && (httpd_conns[i].conn->state == ESPCONN_NONE || httpd_conns[i].conn->state  == ESPCONN_CLOSE)) {
			httpd_conns[i].conn = NULL;
			os_timer_disarm(&httpd_conns[i].timer);
		}
	}

	DEBUG_PRINT("[HTTPD]Disconnected!\n");
}

static void ICACHE_FLASH_ATTR httpd_connect_callback(void *arg) {
	struct espconn *conn=(struct espconn *)arg;
	struct HttpdConnectionSlot *slot = httpd_find_free_slot();
	if (slot == NULL) {
	    DEBUG_PRINT("[HTTPD]Max Number of connections\n");
		//If no slot was found, we've reached the maximum number of connections. Bummer.
		espconn_disconnect(conn);
		return;
	}

	DEBUG_PRINT("[HTTPD]New connection\n");

	slot->conn = conn;
	slot->bufferLen = 0;
	slot->state = HTTPD_STATE_PARSEVERB;
	slot->contentLen = 0;

	espconn_regist_recvcb(conn, httpd_recv_callback);
	espconn_regist_disconcb(conn, httpd_disconnect_callback);
	espconn_regist_sentcb(conn, httpd_sent_callback);

	os_timer_disarm(&slot->timer);
	os_timer_setfn(&slot->timer, (os_timer_func_t *)httpd_timeout_callback, slot);
	os_timer_arm(&slot->timer, CONNECTION_TIMEOUT, 0);
}

void ICACHE_FLASH_ATTR httpd_init(uint16_t port)
{
    DEBUG_PRINT("[HTTPD]Start server on port %d\n", port);

	static struct espconn httpdconn;
	static esp_tcp httpdtcp;

	httpdconn.type = ESPCONN_TCP;
	httpdconn.state = ESPCONN_NONE;
	httpdtcp.local_port = port;
	httpdconn.proto.tcp = &httpdtcp;

	espconn_regist_connectcb(&httpdconn, httpd_connect_callback);
	espconn_accept(&httpdconn);
}

