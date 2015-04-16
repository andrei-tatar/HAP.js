#include <c_types.h>

uint16_t ICACHE_FLASH_ATTR atou16(char** ptr)
{
    char *str = *ptr;

    uint16_t result = 0;
    while (*str >= '0' && *str <= '9')
    {
        result = result * 10 + *str++ - '0';
    }

    *ptr = str;

    return result;
}

void ICACHE_FLASH_ATTR u16toa(uint16_t nr, char** destPtr)
{
    char *dest = *destPtr;

    bool any = false;
    uint8_t aux = nr / 10000;
    if (aux) {*dest++ = aux + '0';any=true;}
    nr %= 10000;

    aux = nr / 1000;
    if (any || aux) {*dest++ = aux + '0';any=true;}
    nr %= 1000;

    aux = nr / 100;
    if (any || aux) {*dest++ = aux + '0';any=true;}
    nr %= 100;

    aux = nr / 10;
    if (any || aux) *dest++ = aux + '0';
    *dest++ = (nr % 10) + '0';

    *destPtr = dest;
}
