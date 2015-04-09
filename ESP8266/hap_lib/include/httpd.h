/*
 * httpd.h
 *
 *  Created on: Nov 19, 2014
 *      Author: frans-willem
 */

#ifndef CONFIG_HTTPD_H_
#define CONFIG_HTTPD_H_
#include <ip_addr.h>
#include <espconn.h>

#define HTTPD_VERB_GET  	0
#define HTTPD_VERB_POST	    1

struct HttpdConnectionSlot;

typedef bool (* httpd_request_callback)(struct HttpdConnectionSlot *slot, uint8_t verb, char* path, uint8_t *data, uint16_t length);

void httpd_send(struct HttpdConnectionSlot *slot, uint16_t code, const char *contentType, const void *data, int length);
void httpd_send_text(struct HttpdConnectionSlot *slot, uint16_t code, const char *fmt, ...);
void httpd_send_html(struct HttpdConnectionSlot *slot, uint16_t code, const char *fmt, ...);

void httpd_init(uint16_t port);
void httpd_register(httpd_request_callback request_callback);

#endif /* CONFIG_HTTPD_H_ */
