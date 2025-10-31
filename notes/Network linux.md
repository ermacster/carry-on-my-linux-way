Просмотр всех сетевых интерфейсов
bashnetworkctl list
ip addr show
Работа с Netplan
Просмотр конфигурации
bashsudo cat /etc/netplan/*.yaml
Применить конфигурацию
bashsudo netplan apply
Проверить и временно применить (откат через 120 сек)
bashsudo netplan try
Проверить синтаксис конфигов (генерирует конфигурацию для systemd-networkd)
bashsudo netplan generate
Проверить синтаксис конфигов с отладкой
bashsudo netplan --debug apply
Примеры конфигураций
Базовая конфигурация (DHCP)
yaml# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens160:
      dhcp4: true
      dhcp6: true
      optional: true
Статический IP
yaml# /etc/netplan/01-static.yaml
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
В новых версиях вместо gateway4 используйте:
yamlroutes:
  - to: default
    via: 192.168.1.1
Диагностика
Проверить статус интерфейса
bashnetworkctl status ens160
Проверить DHCP аренду
bashsudo netplan ip leases ens160
Проверить DNS (в новых версиях — resolvectl)
bashresolvectl status
Или (устаревшее):
bashsystemd-resolve --status
Тестирование связи
bashping -c 3 8.8.8.8
Важные заметки

Конфигурационные файлы находятся в /etc/netplan/ и имеют расширение .yaml.
После внесения изменений обязательно выполните:
bashsudo netplan apply

Для теста:
bashsudo netplan try
Если вы не подтвердите изменения в течение 120 секунд, конфигурация автоматически откатится.
systemd-networkd — легковесный сетевой менеджер, подходящий для серверов.
NetworkManager — чаще используется в десктопных средах (GNOME, KDE и т.д.). Убедитесь, что в вашем YAML указан правильный renderer.


