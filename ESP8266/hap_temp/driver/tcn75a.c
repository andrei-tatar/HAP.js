#include "i2c.h"

static uint8_t _address = 0x48;
static char *decMap[] =
{
	"0", "0625", "125", "1875",
	"25", "3125", "375", "4375",
	"5", "5625", "625", "6875",
	"75", "8125", "875", "9375"
};

bool ICACHE_FLASH_ATTR tcn_read(char* buffer)
{
	i2c_start();

	i2c_writeByte(_address);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	uint8 msb = i2c_readByte();
	i2c_send_ack(1);
	uint8 lsb = i2c_readByte();
	i2c_send_ack(0);
	i2c_stop();

	char *w = buffer;
	if (msb & 0x80) {*w++='-';msb&=0x7F;}

	uint8_t aux = msb / 100;
	bool st = false;
	if (aux) {*w++=aux+'0';st=true;}

	msb %= 100;
	aux = msb / 10;
	if (aux||st) *w++=aux+'0';

	msb %= 10;
	*w++ = msb+'0';
	*w++ = '.';
	os_strcpy(w, decMap[lsb >> 4]);

	return true;
}

bool ICACHE_FLASH_ATTR tcn_init(uint8_t address)
{
	//read address
	_address = (address << 1) | 0x01;

	i2c_start();

	i2c_writeByte(address << 1);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	//config register
	i2c_writeByte(0x01);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	//12 bit resolution
	i2c_writeByte(0x60);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	i2c_stop();

	//select the temperature register and leave it
	i2c_start();

	i2c_writeByte(address << 1);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	i2c_writeByte(0);
	if (!i2c_check_ack())
	{
		i2c_stop();
		return false;
	}

	i2c_stop();

	return true;
}
