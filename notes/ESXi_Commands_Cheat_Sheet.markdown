# ESXi Commands Cheat Sheet for VMFS, Snapshot Volumes, and Disks

| Команда | Что делает | Типичные кейсы / примеры использования |
|---------|------------|---------------------------------------|
| `esxcli storage vmfs snapshot list` | Показывает все unresolved VMFS тома (snapshot volumes) | После клонирования или восстановления диска, когда ESXi не видит датастор. |
| `esxcli storage vmfs snapshot resignature -l <VolumeLabel>` | Присваивает новый UUID snapshot volume, позволяет смонтировать его как новый датастор | Решение конфликта UUID после клонирования диска или подключения старого тома в новую среду ESXi. |
| `esxcli storage vmfs extent list` | Показывает все extents (физические диски), на которых расположен VMFS датастор | Проверка структуры VMFS перед добавлением нового диска, или для диагностики spanning/extents. |
| `esxcli storage filesystem list` | Список всех смонтированных файловых систем (VMFS и vFAT), их размер, свободное место, UUID | Проверка состояния датасторов перед добавлением extents или обновлением ESXi. |
| `esxcli storage core device list` | Полный список всех видимых дисков, с Vendor, Model, размером, SSD/ATA/SAS, UUID | Диагностика конфликтов UUID, проверка физических дисков перед присоединением к VMFS. |
| `ls -l /vmfs/devices/disks/` | Быстрый просмотр всех дисков и псевдонимов (vml, mpx пути) | Быстрый анализ доступных устройств на ESXi, поиск нужного диска по имени. |
| `vmkfstools -Ph /vmfs/devices/disks/<Device>:<Partition>` | Проверка VMFS, показывает UUID, Label, размер, partitions spanned | Проверка integrity диска перед resignature или добавлением extents. |
| `partedUtil getptbl /vmfs/devices/disks/<Device>` | Выводит GPT таблицу диска | Диагностика проблем с GPT, проверка свободного места и разделов перед использованием в VMFS. |

## Ключевые моменты
- **Snapshot volume**: Диск с VMFS, который ESXi не может смонтировать из-за UUID конфликта.
- **Resignature**: Безопасный способ присвоить новый UUID без потери данных.
- **Extent**: Физический диск, входящий в состав VMFS тома. Один том может спанить несколько extents.
- **Совет**: Перед добавлением нового диска в VMFS всегда проверяй: UUID, partitions spanned, наличие данных.