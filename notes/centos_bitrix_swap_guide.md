# 🧠 Изменение swap-раздела в CentOS / Bitrix

> Подробный гайд по безопасному изменению или пересозданию **swap-раздела** в CentOS или Bitrix Environment.  
> Полезен при изменении размера диска или повреждении swap-раздела.

---

## ⚙️ 1. Подготовка

Проверяем текущий **UUID swap** в `/etc/fstab`:

```bash
cat /etc/fstab | grep swap
```

> 🔹 Запомните или скопируйте **UUID**, который используется системой.

---

## 📴 2. Отключаем swap

```bash
sudo swapoff -a
```

---

## 💾 3. Работа с разделами в cfdisk

Открываем диск в редакторе разделов:

```bash
sudo cfdisk /dev/sda
```

Далее:

1. Удаляем старый swap-раздел (обычно `/dev/sda2`)
2. Расширяем основной раздел (если нужно)
3. Создаём **новый swap-раздел** в свободном месте
4. Устанавливаем **тип 82** — *Linux swap / Solaris*

---

## 🔄 4. Обновляем информацию о разделах без перезагрузки

```bash
# Способ 1 (чаще всего работает)
sudo partprobe /dev/sda

# Альтернатива
sudo blockdev --rereadpt /dev/sda
```

> 💡 Для систем с LVM можно также использовать:
```bash
sudo pvscan
```

---

## 🧩 5. Форматируем swap с нужным UUID

Создаём swap-раздел с тем же UUID, который был ранее (важно для Bitrix!):

```bash
sudo mkswap -U НУЖНЫЙ_UUID /dev/sdaX
```

где `X` — номер нового swap-раздела (например, `sda2`).

---

## 🚀 6. Включаем swap и проверяем

```bash
sudo swapon -a
swapon --show
free -h
```

---

## 🧰 Полезные команды

### Обновление информации о разделах

```bash
# Способ 1 (чаще работает)
sudo partprobe /dev/sda

# Способ 2 (альтернатива)
sudo blockdev --rereadpt /dev/sda

# Способ 3 (для дисков с LVM)
sudo pvscan
```

### Проверка разделов

```bash
lsblk
fdisk -l /dev/sda
cat /proc/partitions
```

### Работа с swap

```bash
# Проверка состояния swap
swapon --show
free -h

# Включить/выключить swap из fstab
sudo swapon -a
sudo swapoff -a
```

---

## ⚠️ Важные моменты

- Всегда сохраняйте **UUID swap**, который использует система.  
- В Bitrix окружении UUID часто жёстко прописан в нескольких местах.  
- Команда `partprobe` обновляет таблицу разделов **без перезагрузки**.  
- После изменений обязательно **проверьте загрузку системы**.

---

## 🧯 Если возникли проблемы при загрузке

1. При загрузке в **GRUB** нажмите клавишу **`e`** — откроется режим редактирования.
2. Удалите параметр `resume=UUID=...` из строки загрузки.
3. Запустите систему сочетанием клавиш **Ctrl + X**.
4. После входа проверьте `/etc/fstab` и UUID swap.

---

## 📚 Резюме

| Этап | Действие |
|------|-----------|
| 1 | Проверить UUID swap |
| 2 | Отключить swap |
| 3 | Удалить/создать новый раздел (тип 82) |
| 4 | Обновить таблицу разделов (`partprobe`) |
| 5 | Создать swap с нужным UUID (`mkswap -U`) |
| 6 | Включить swap и проверить (`swapon --show`) |

---

## 📎 Источники
- [Red Hat Docs: Managing Swap Space](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/assembly_configuring-swap-space_configuring-and-managing-logical-volumes)
- [man mkswap](https://man7.org/linux/man-pages/man8/mkswap.8.html)
