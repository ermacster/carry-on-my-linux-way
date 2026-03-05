# Решение: собственный прокси‑сервер для ChatGPT (HTTP + PAC)

Цель: направлять **только трафик OpenAI через прокси**, а остальные
сайты открывать напрямую с помощью PAC‑скрипта.

------------------------------------------------------------------------

## Архитектура

-   VDS: Нидерланды
-   ОС: Ubuntu 22.04
-   Прокси: 3proxy
-   Маршрутизация: PAC
-   Клиенты: Chrome / Firefox / Edge

------------------------------------------------------------------------

# 1. Предварительные требования

Сервер:

-   Ubuntu 20.04 / 22.04
-   512 MB RAM минимум
-   для 15 пользователей лучше 2 CPU / 2 GB RAM
-   SSH доступ

Пример IP:

    YOUR_SERVER_IP

------------------------------------------------------------------------

# 2. Полная очистка старой установки 3proxy

``` bash
sudo systemctl stop 3proxy 2>/dev/null
sudo systemctl disable 3proxy 2>/dev/null
sudo pkill -f 3proxy

sudo rm -f /usr/local/bin/3proxy /usr/bin/3proxy /bin/3proxy
sudo rm -rf /etc/3proxy /usr/local/3proxy /var/log/3proxy*
sudo rm -f /etc/systemd/system/3proxy.service

sudo systemctl daemon-reload
```

Проверка:

``` bash
ps aux | grep 3proxy
```

------------------------------------------------------------------------

# 3. Установка 3proxy

``` bash
cd /tmp

wget https://github.com/z3APA3A/3proxy/releases/download/0.9.4/3proxy-0.9.4.x86_64.deb

sudo dpkg -i 3proxy-0.9.4.x86_64.deb

sudo apt-get install -f
```

После установки:

-   Бинарник: `/usr/bin/3proxy`
-   Конфиг: `/etc/3proxy/conf`
-   Логи: `/var/log/3proxy`

------------------------------------------------------------------------

# 4. Настройка 3proxy

## Создание пользователя

``` bash
sudo /etc/3proxy/conf/add3proxyuser.sh vrt YourStrongPassword
```

Пароль должен содержать **только буквы и цифры**.

------------------------------------------------------------------------

## Основной конфиг

Открыть:

``` bash
sudo nano /etc/3proxy/conf/3proxy.cfg
```

Содержимое:

    nscache 65536
    nserver 8.8.8.8
    nserver 8.8.4.4

    config /conf/3proxy.cfg
    monitor /conf/3proxy.cfg

    log /logs/3proxy-%y%m%d.log D
    rotate 60
    counter /count/3proxy.3cf

    users $/conf/passwd

    include /conf/counters
    include /conf/bandlimiters

    auth strong

    proxy -p3128 -n -a

------------------------------------------------------------------------

# 5. Открытие порта

``` bash
sudo ufw allow 3128/tcp
sudo ufw reload
```

------------------------------------------------------------------------

# 6. Запуск сервиса

``` bash
sudo systemctl enable 3proxy
sudo systemctl start 3proxy
sudo systemctl status 3proxy
```

Просмотр логов:

``` bash
sudo journalctl -u 3proxy -f
```

------------------------------------------------------------------------

# 7. Проверка прокси

``` bash
curl -v -x http://vrt:YourStrongPassword@YOUR_SERVER_IP:3128 http://2ip.ru
```

Должен отображаться **IP вашего сервера**.

------------------------------------------------------------------------

# 8. Создание PAC файла

``` javascript
function FindProxyForURL(url, host) {

    if (
        host == "chat.openai.com" ||
        host == "chatgpt.com" ||
        dnsDomainIs(host, ".openai.com") ||
        dnsDomainIs(host, ".oaistatic.com") ||
        dnsDomainIs(host, ".auth0.com") ||
        dnsDomainIs(host, ".sentry.io") ||
        dnsDomainIs(host, ".intercom.com") ||
        dnsDomainIs(host, ".intercomcdn.com")
    ) {
        return "PROXY YOUR_SERVER_IP:3128";
    }

    return "DIRECT";
}
```

------------------------------------------------------------------------

# 9. Размещение PAC файла

## Через nginx

``` bash
sudo apt install nginx -y
sudo cp proxy.pac /var/www/html/
```

Проверка:

``` bash
curl http://YOUR_SERVER_IP/proxy.pac
```

------------------------------------------------------------------------

# 10. Настройка браузеров

## Chrome / Edge

Настройки → Система → Прокси

    Использовать сценарий настройки

URL:

    http://YOUR_SERVER_IP/proxy.pac

------------------------------------------------------------------------

## Firefox

Настройки → Сеть → Прокси

    URL автоматической настройки

------------------------------------------------------------------------

# Проверка

Открыть:

    https://chat.openai.com

Проверить IP:

    https://2ip.ru

Если всё работает:

-   ChatGPT → IP сервера
-   другие сайты → ваш IP

------------------------------------------------------------------------

# Безопасность

Ограничение по IP:

``` bash
sudo ufw allow from CLIENT_IP to any port 3128
```

------------------------------------------------------------------------

# Мониторинг

Логи:

    /var/log/3proxy

------------------------------------------------------------------------

# Производительность

Для 15 пользователей достаточно:

-   4 CPU
-   6 GB RAM

------------------------------------------------------------------------

# Заключение

Клиент настраивает PAC **один раз** и больше не думает о прокси.
