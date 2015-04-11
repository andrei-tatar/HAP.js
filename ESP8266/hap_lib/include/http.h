/*
 * http.h
 *
 *  Created on: Feb 19, 2015
 *      Author: X550L-User1
 */

#ifndef INCLUDE_HTTP_H_
#define INCLUDE_HTTP_H_

extern const char* verb_get;
extern const char* verb_post;

extern const char* mime_textplain;
extern const char* mime_texthtml;
extern const char* mime_application_json;

#define KEEP_ALIVE_TIMEOUT  30000
#define CONNECTION_TIMEOUT  3000

#define DEBUG   0

#if DEBUG
#define DEBUG_PRINT ets_uart_printf
#else
#define DEBUG_PRINT
#endif

#endif /* INCLUDE_HTTP_H_ */
