# Настройка прозрачного проксирования трафика через Redsocks с MikroTik

## 1. Общая схема

- В сети есть Linux-машина с установленным **Redsocks** — сервисом для прозрачного проксирования TCP-трафика через HTTP/HTTPS-прокси (в данном случае — прокси Ideco).
- На MikroTik выполняется маркировка трафика в `mangle` по списку IP-адресов сайтов (ipset / address-list `via-proxy`).
- Создаётся таблица маршрутизации `to-proxy` для трафика с маркировкой.
- В MikroTik добавляется маршрут по умолчанию для перенаправления маркированного трафика на Linux-сервер с Redsocks.
- На Linux через `iptables` с `ipset` весь трафик с указанных IP перенаправляется на локальный порт Redsocks (обычно `12345`).
- Redsocks перенаправляет трафик через HTTP CONNECT прокси Ideco.

## 2. Установка и описание Redsocks

Установка Redsocks:
```sh
apt update
apt install redsocks
```
- **Описание**: Redsocks — демон, который слушает локальный порт и перенаправляет входящий TCP-трафик на прокси-сервер (HTTP, SOCKS4/5).

## 3. Пример рабочего конфига `/etc/redsocks.conf`

```plaintext
base {
    log_debug = off;
    log_info = on;
    daemon = on;
    redirector = iptables;
}

redsocks {
    local_ip = 0.0.0.0;
    local_port = 12345;
    ip = 10.3.0.240;       # IP прокси Ideco
    port = 8080;           # Порт прокси Ideco
    type = http-connect;   # Используем HTTP CONNECT для HTTPS/HTTP проксирования
    # login = "user";      # Если требуется - закомментировано
    # password = "";
}
```

## 4. Работа с ipset на Linux

- **Что такое ipset?**  
  `ipset` — утилита для создания множества IP-адресов или подсетей, которые используются в `iptables` для быстрого сопоставления и фильтрации трафика.

Команды:
```sh
# Создание множества для IP-адресов
ipset create via-proxy hash:ip

# Добавление IP-адресов сайтов в множество
ipset add via-proxy 213.24.64.140
ipset add via-proxy 91.213.144.193
# Добавить остальные IP по списку
```

## 5. Настройка iptables для перенаправления трафика

```sh
# Создание цепочки REDSOCKS для обработки трафика
iptables -t nat -N REDSOCKS

# Исключение локальных и служебных адресов из редиректа
iptables -t nat -A REDSOCKS -d 0.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 169.254.0.0/16 -j RETURN
iptables -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN
iptables -t nat -A REDSOCKS -d 192.168.0.0/16 -j RETURN
iptables -t nat -A REDSOCKS -d 224.0.0.0/4 -j RETURN
iptables -t nat -A REDSOCKS -d 240.0.0.0/4 -j RETURN

# Перенаправление TCP-трафика, совпадающего с ipset, на локальный порт Redsocks
iptables -t nat -A REDSOCKS -p tcp -j REDIRECT --to-ports 12345

# Применение цепочки REDSOCKS к трафику, если dst IP входит в множество via-proxy
iptables -t nat -A PREROUTING -p tcp -m set --match-set via-proxy dst -j REDSOCKS
```

## 6. Настройка MikroTik

### 6.1. Добавление адресов в список `via-proxy`

```shell
/ip firewall address-list
add address=213.24.64.140 list=via-proxy comment="service.nalog.ru"
add address=91.213.144.193 list=via-proxy comment="online.sbis.ru"
# Добавить остальные адреса по аналогии
```

### 6.2. Маркировка трафика в `mangle`

```shell
/ip firewall mangle
add chain=prerouting dst-address-list=via-proxy action=mark-routing new-routing-mark=to-proxy passthrough=yes in-interface=ether2 comment="Mark proxy traffic"
```

### 6.3. Создание таблицы маршрутизации и маршрута

```shell
/ip route
add dst-address=0.0.0.0/0 gateway=10.187.192.186 routing-mark=to-proxy comment="Route proxy marked traffic to redsocks server"
```

## 7. Проверка состояния

### 7.1. На Linux

- Список IP в `ipset`:
  ```sh
  ipset list via-proxy
  ```

- Текущие правила `iptables`:
  ```sh
  iptables -t nat -L REDSOCKS -n -v --line-numbers
  iptables -t nat -L PREROUTING -n -v --line-numbers
  ```

- Проверка, что Redsocks слушает порт:
  ```sh
  ss -tunlp | grep 12345
  ```

## 8. Итоги

- Организовано прозрачное проксирование трафика для определённых IP-адресов.
- Использован `ipset` для быстрого сопоставления IP.
- На MikroTik маркирован трафик и направлен через специальную таблицу маршрутизации на Linux-сервер.
- На Linux с помощью `iptables` и Redsocks трафик перенаправляется через корпоративный HTTP-прокси Ideco.

## 9. Дополнительно

Команды для быстрого просмотра текущих IP-адресов в `ipset`:
```sh
ipset list via-proxy
```