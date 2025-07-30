# SNMP v2 Monitoring Scheme for MikroTik via Zabbix

## 1. Настройка SNMP v2 на MikroTik

### Шаг 1: Включить SNMP на MikroTik
```bash
/snmp set enabled=yes
```

### Шаг 2: Указать контакт, локацию и имя устройства (по желанию)
```bash
/snmp set contact="Админ" location="Data Center A" name="RTK_GW01"
```

### Шаг 3: Установить комьюнити
```bash
/snmp community add name=public addresses=0.0.0.0/0 read-access=yes
```

- **Важно:** убедитесь, что IP-адрес Zabbix-сервера разрешён в firewall MikroTik для SNMP.

## 2. Установка пакета snmp и получение OID

### Debian/Ubuntu:
```bash
sudo apt update && sudo apt install snmp snmp-mibs-downloader -y
```

### Получение списка OID:
```bash
snmpwalk -v2c -c public 192.168.88.1
```

### Получение конкретного OID:
```bash
snmpget -v2c -c public 192.168.88.1 .1.3.6.1.2.1.1.3.0
```

## 3. Добавление SNMP-узла в Zabbix

1. Перейти в Configuration → Hosts
2. Нажать "Create Host"
3. Указать:
   - Имя хоста: `RTK_GW01`
   - Группу: например `Network Devices`
   - Интерфейс: `SNMP`, IP-адрес MikroTik
4. Перейти во вкладку "Templates" и прикрепить шаблон `Template Net SNMP Generic`

## 4. Создание собственного Item и Trigger

### Item (ключ):
```
custom.matht04.custom.xlebokominat
```
- Тип: `SNMPv2 agent`
- SNMP OID: **(указать нужный OID, например, .1.3.6.1.x.x)**
- Тип информации: Numeric (unsigned)
- Прототип Item создан вручную

### Значения:
- `1` = Up
- `2` = Down

### Trigger:
```
last(/RTK_GW01/custom.matht04.custom.xlebokominat,#3)=2
```
- Проверка последних 3 значений
- Срабатывает, если 3 подряд — значение "2" (Down)

## 5. Общая схема мониторинга

- **MikroTik** отдаёт SNMP-значения по настроенным OID'ам.
- **Zabbix Server** опрашивает значения через SNMPv2.
- **Item** в Zabbix получает статус по заданному OID.
- **Trigger** срабатывает при потере связи или статусе "Down".
- Визуализация и уведомления настраиваются через Action в Zabbix.

---

> 🔧 Это решение устойчиво, масштабируемо и подходит для типового SNMP-мониторинга микротиков в инфраструктуре уровня провайдера или среднего предприятия.

