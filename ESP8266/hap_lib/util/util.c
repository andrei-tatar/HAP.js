#include "osapi.h"
#include "user_interface.h"
#include "espconn.h"

bool ICACHE_FLASH_ATTR setup_wifi_ap_mode(const char* ssid)
{
	if (wifi_get_opmode() != SOFTAP_MODE)
	    wifi_set_opmode(SOFTAP_MODE);

    struct softap_config apConfig;
    wifi_softap_get_config(&apConfig);
    os_strcpy(apConfig.ssid, ssid);

    if (wifi_get_opmode() != SOFTAP_MODE)
        return false;

    apConfig.authmode = AUTH_OPEN;
    apConfig.channel = 7;
    apConfig.max_connection = 255;
    apConfig.ssid_hidden = 0;
    wifi_softap_set_config(&apConfig);

	return true;
}

bool ICACHE_FLASH_ATTR setup_wifi_st_mode(const char* ssid, const char* password)
{
	wifi_set_opmode(STATION_MODE);
	struct station_config stconfig;
	wifi_station_disconnect();
	wifi_station_dhcpc_stop();
	if(wifi_station_get_config(&stconfig))
	{
		ets_uart_printf("SSID: %s, PASS: %s\n", stconfig.ssid, stconfig.password);

		os_strcpy(stconfig.ssid, ssid);
		os_strcpy(stconfig.password, password);

		if(!wifi_station_set_config(&stconfig))
			return false;
	}

	wifi_station_connect();
	wifi_station_dhcpc_start();
	wifi_station_set_auto_connect(1);

	if (wifi_get_phy_mode() != PHY_MODE_11N)
		wifi_set_phy_mode(PHY_MODE_11N);
	if (!wifi_station_get_auto_connect())
		wifi_station_set_auto_connect(true);

	return true;
}

