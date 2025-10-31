# Основные команды управления сетью в Ubuntu/Debian с Netplan и systemd-networkd

> Полезные команды и примеры конфигураций для настройки и диагностики сети в системах, использующих **Netplan** (например, Ubuntu 18.04+).

---

## 🧭 Проверка сетевых служб

```bash
# Какая служба управляет сетью
systemctl status systemd-networkd
systemctl status systemd-resolved

# Просмотр всех сетевых интерфейсов
networkctl list
ip addr show
```
👁️ Просмотр информации
bash
# Просмотр сетевых интерфейсов
ip addr show

# Проверить статус служб
systemctl status systemd-networkd

# Показать текущую конфигурацию
netplan status

---

## ⚙️ Работа с Netplan

```bash
# Просмотр конфигурации
sudo cat /etc/netplan/*.yaml

# Применить конфигурацию
sudo netplan apply

# Проверить и временно применить (откат через 120 сек)
sudo netplan try

# Проверить синтаксис конфигов (генерирует конфигурацию для systemd-networkd)
sudo netplan generate

# Проверить синтаксис конфигов
sudo netplan --debug apply
```

---

## 📄 Примеры конфигураций

### DHCP-конфигурация
```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens160:
      dhcp4: true
      dhcp6: true
      optional: true
```

### Статический IP
```yaml
# /etc/netplan/01-static.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens160:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]

# В новых версиях вместо gateway4
routes:
  - to: default
    via: 192.168.1.1
```

---

## 🔍 Диагностика сети

```bash
# Проверить статус интерфейса
networkctl status ens160

# Проверить DHCP аренду
sudo netplan ip leases ens160

# Проверить DNS (в новых версиях — resolvectl)
resolvectl status

# Или (устаревшее):
systemd-resolve --status

# Тестирование связи
ping -c 3 8.8.8.8
```

---

## 🧠 Важные заметки

- Конфигурационные файлы находятся в `/etc/netplan/` и имеют расширение `.yaml`.
- После внесения изменений обязательно выполните:
  ```bash
  sudo netplan apply
  ```
- Для теста:
  ```bash
  sudo netplan try
  ```
  Если вы не подтвердите изменения в течение **120 секунд**, конфигурация автоматически **откатится**.
- `systemd-networkd` — легковесный сетевой менеджер, подходящий для серверов.
- `NetworkManager` — чаще используется в десктопных средах (GNOME, KDE и т.д.).  
  Убедитесь, что в вашем YAML указан правильный **renderer**.

