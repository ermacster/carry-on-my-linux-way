# 💽 Расширение диска в Ubuntu с использованием LVM

> Этот мини-гайд описывает процесс **расширения диска** в системе Ubuntu, где используется **Logical Volume Manager (LVM)**.  
> Подходит для случаев, когда вы увеличили размер виртуального диска в **AWS, GCP, Azure**, **VirtualBox** или **VMware**.

---

## ⚠️ Предупреждение

- Все команды выполняются с **правами root** (используйте `sudo`).
- Перед началом **создайте резервную копию** данных — ошибки могут привести к потере информации.
- Замените устройства (`/dev/sda`, `/dev/sda2`, `ubuntu-vg`, `ubuntu-lv`) на ваши реальные (проверьте с помощью `lsblk` или `pvdisplay`).
- Убедитесь, что установлен пакет **cloud-utils-growpart** для команды `growpart`:
  ```bash
  sudo apt install cloud-utils
  ```
- Инструкции рассчитаны на файловую систему **ext4**.  
  Для **XFS** используйте `xfs_growfs` вместо `resize2fs`.

---

## 🚀 Основные шаги по расширению диска

### 1️⃣ Пересканировать диск
Обновляем информацию о размере диска после увеличения его физического объёма.

```bash
echo 1 | sudo tee /sys/class/scsi_device/*/device/rescan
```

---

### 2️⃣ Расширить раздел диска (если нужно)
Если раздел не занимает весь диск, расширьте его с помощью `growpart`.

Пример: расширить второй раздел на `/dev/sda`.
```bash
sudo growpart /dev/sda 2
```

---

### 3️⃣ Расширить физический том (PV)
Обновляем PV после изменения размера раздела.
```bash
sudo pvresize /dev/sda2
```

---

### 4️⃣ Расширить логический том (LV)
Распределяем всё свободное место на логический том.
```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
```

---

### 5️⃣ Расширить файловую систему
Адаптируем файловую систему под новый размер LV.
```bash
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

---

### ✅ Проверка результата
```bash
df -h
lsblk
```

---

## 🔍 Полезные команды LVM

### Просмотр информации
```bash
pvdisplay     # Детали физических томов (PV)
vgdisplay     # Детали групп томов (VG)
lvdisplay     # Детали логических томов (LV)
pvs, vgs, lvs # Краткие версии
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT # Общая структура дисков
fdisk -l
parted -l
```

---

### Создание и расширение
```bash
pvcreate /dev/sdX                   # Создать новый PV
vgcreate my-vg /dev/sdX             # Создать VG
vgextend my-vg /dev/sdY             # Добавить новый PV в VG
lvcreate -L 10G -n my-lv my-vg      # Создать LV на 10 ГБ
lvextend -L +5G /dev/my-vg/my-lv    # Расширить LV на 5 ГБ
```

---

### Уменьшение и удаление
> ⚠️ При уменьшении сначала уменьшите файловую систему!

```bash
sudo resize2fs /dev/my-vg/my-lv 20G  # Уменьшить FS до 20 ГБ
sudo lvreduce -L 20G /dev/my-vg/my-lv
sudo lvremove /dev/my-vg/my-lv       # Удалить LV
sudo vgreduce my-vg /dev/sdX         # Удалить PV из VG (если свободен)
sudo vgremove my-vg                  # Удалить VG
sudo pvremove /dev/sdX               # Удалить PV
```

---

### Дополнительные утилиты
```bash
vgscan, pvscan, lvscan      # Обновить информацию о LVM
lvrename /dev/my-vg/old-lv new-lv
vgchange -ay                # Активировать VG
lvs -o +devices             # Показать устройства, связанные с LV
```

---

## 💡 Полезные советы

- Проверка свободного пространства:  
  ```bash
  vgs
  vgdisplay -v
  ```
- Мониторинг:  
  ```bash
  watch -n 1 df -h
  ```
- Если `pvresize` не видит новое место — проверьте раздел с помощью `growpart`.
- Для XFS:
  ```bash
  sudo xfs_growfs /mount/point
  ```
- Документация:
  ```bash
  man lvm
  man pvresize
  ```

---

## 📚 Источники
- [Официальная документация Ubuntu — LVM](https://help.ubuntu.com/community/LogicalVolumeManagement)
- [man lvm(8)](https://man7.org/linux/man-pages/man8/lvm.8.html)
