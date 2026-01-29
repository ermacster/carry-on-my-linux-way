# Защита RDP через IPsec с использованием сертификатов (без домена)

**Кратко:** этот гайд описывает настройку блокировки доступа к RDP (порт 3389) для всех устройств, не имеющих валидного машинного сертификата. Сценарий включает сервер (DC + CA) и клиентский ПК вне домена. Результат — RDP доступ возможен только при наличии установленного сертификата.

---

## Содержание
1. [Среда](#среда)  
2. [Этап 1 — Настройка Центра Сертификации (CA)](#этап-1---настройка-центра-сертификации-ca)  
3. [Этап 2 — Генерация и экспорт сертификатов](#этап-2---генерация-и-экспорт-сертификатов)  
4. [Этап 3 — Настройка клиента](#этап-3---настройка-клиента)  
5. [Этап 4 — Настройка IPsec на сервере](#этап-4---настройка-ipsec-на-сервере)  
6. [Этап 5 — Настройка IPsec на клиенте](#этап-5---настройка-ipsec-на-клиенте)  
7. [Этап 6 — Hardening (CRL)](#этап-6---hardening-crl)  
8. [Доп. этап — Дебаг и сброс кеша](#доп-этап---дебаг-и-сброс-кеша)  
9. [Скрипты для тестов](#скрипты-для-тестов)  
10. [Примечания и рекомендации](#примечания-и-рекомендации)

---

## Среда

- **Server:** Windows Server 2016 (Roles: DC, CA, NPS/Firewall).  
- **Client:** Windows 10/11 (Workgroup — не в домене).  
- **Цель:** RDP доступ только при наличии установленного клиентского сертификата.

---

## Этап 1 — Настройка Центра Сертификации (CA)

### 1. Установка ролей
1. Server Manager -> **Add Roles and Features**.  
2. Выбрать роль **Active Directory Certificate Services**.  
3. В Role Services отметить:
   - Certification Authority  
   - Certification Authority Web Enrollment (опционально для удобства).  
4. После установки — **Post-deployment configuration**:
   - **Type:** Enterprise CA  
   - **Type:** Root CA  
   - **Private Key:** Create a new private key  
   - **Hash:** SHA256  
   - **Validity:** 5 лет (настраивается по желанию)

### 2. Создание шаблона сертификата (для ПК вне домена)
Поскольку клиент вне домена, требуется возможность указать Subject вручную.

1. `Win + R` -> `certsrv.msc`.  
2. **Certificate Templates** -> правой кнопкой -> **Manage**.  
3. Найти `Workstation Authentication` -> ПКМ -> **Duplicate Template**.  
4. Во вкладках шаблона:
   - **General**: `Name: IPsec_NonDomain` (или любое понятное имя).  
   - **Request Handling**: поставить **Allow private key to be exported** (нужно для переноса на клиент).  
   - **Subject Name**: выбрать **Supply in the request**.  
   - **Security**: убедиться, что у `Admin` / `Authenticated Users` есть права **Enroll**.  
5. Сохранить шаблон.  
6. В консоли CA: **Certificate Templates** -> ПКМ -> **New -> Certificate Template to Issue** -> выбрать `IPsec_NonDomain`.

---

## Этап 2 — Генерация и экспорт сертификатов (выполняется на сервере)

### 1. Выпуск сертификата для клиента
1. `mmc` -> **Add Snap-in** -> **Certificates (Computer Account, Local Computer)**.  
2. `Personal` -> ПКМ -> **All Tasks -> Request New Certificate**.  
3. Выбрать шаблон `IPsec_NonDomain`.  
4. Нажать **More information is required...**:
   - **Subject Name Type:** Common Name  
   - **Value:** Имя клиента (например, `Client-Laptop`)  
5. Нажать **Enroll**.

### 2. Экспорт для переноса

#### Сертификат клиента
1. В `Personal` найти выданный сертификат.  
2. ПКМ -> **Export** -> **Yes, export the private key** -> формат PFX.  
3. Задать пароль. Сохранить как `Client.pfx`.

#### Корневой сертификат (CA)
1. `Trusted Root Certification Authorities` -> `Certificates`.  
2. Найти свой CA.  
3. ПКМ -> **Export** -> **No, do not export private key** -> **DER (.CER)**.  
4. Сохранить как `RootCA.cer`.

---

## Этап 3 — Настройка клиента

Перенести `Client.pfx` и `RootCA.cer` на клиентский ПК.

1. `mmc` -> **Certificates (Computer Account!)** — важно выбрать именно **Computer Account**.  
2. **Импорт корневого:**  
   - `Trusted Root Certification Authorities` -> Import -> выбрать `RootCA.cer`.  
3. **Импорт личного сертификата:**  
   - `Personal` -> Import -> выбрать `Client.pfx`.  
   - Ввести пароль.  
   - **ВАЖНО:** при установке снимите галочку **Mark this key as exportable** (чтобы предотвратить копирование пользователем).

---

## Этап 4 — Настройка IPsec на сервере

Откройте: `Win + R` -> `wf.msc` (Windows Defender Firewall with Advanced Security).

### 1. Connection Security Rule (Правило безопасности подключения)
Создаёт защищённый туннель (Main Mode).

- **Rule Type:** Custom  
- **Endpoints:** Any IP <-> Any IP (или ограничьте до подсети/серверного IP)  
- **Authentication:** Method: **Computer certificate from this CA**  
- **Requirements:** Require authentication for inbound and outbound  
- **Profile:** Domain, Private, Public  
- **Name:** `IPsec_Policy_Server`

> Совет: для простоты тестирования сначала разрешите логирование и включите режим отладки, потом уж применяйте на проде.

### 2. Inbound Firewall Rule (Правило брандмауэра)
Блокирует порт 3389 для неподписанных соединений, но разрешает, если соединение защищено IPsec.

- **Rule Type:** Port (TCP 3389)  
- **Action:** **Allow the connection if it is secure**  
- Настройки: **Customize** -> **Allow the connection if it is authenticated and integrity-protected**  
  - (Иногда опция "Require encryption" конфликтует с RDP — типично достаточно integrity, т.к. RDP сам по себе шифрован).  
- **Name:** `RDP_Secure_Only`

### 3. Зачистка (КРИТИЧНО)
Отключите все стандартные правила RDP, которые включены (светятся зелёным), особенно:

- `Remote Desktop - User Mode (TCP-In)`  
- `Remote Desktop - Shadow (TCP-In)`  
- `Remote Desktop - User Mode (UDP-In)`

Иначе стандартные правила позволят обходить IPsec.

---

## Этап 5 — Настройка IPsec на клиенте

На клиенте: `Win + R` -> `wf.msc`.

### 1. Connection Security Rule
- **Endpoint 1:** Any IP  
- **Endpoint 2:** Server IP Address (ограничьте — чтобы не шифровать весь трафик)  
- **Authentication:** Computer certificate from this CA  
- **Name:** `IPsec_to_Server`

> Правила inbound на клиенте обычно не нужны для данного сценария (client инициирует соединение).

---

## Этап 6 — Hardening (Проверка CRL — отзыв сертификатов)

Чтобы сервер немедленно перестал принимать отозванные сертификаты, включите строгую проверку CRL:

На сервере (cmd в режиме администратора):

```cmd
netsh advfirewall set global ipsec strongcrlcheck 1
```

Это заставит IPsec проверять статус сертификата в CRL более строго.

---

## Доп. этап — Дебаг и Сброс кеша

Если сертификат отозван, но доступ всё ещё есть, или сертификат обновлён, но доступа нет — нужно сбросить кеш IPsec и CRL.

**Команды (на Сервере и Клиенте):**

```cmd
:: 1. Удаление сохраненных ассоциаций безопасности (разрыв соединений)
netsh advfirewall monitor delete mmsa
netsh advfirewall monitor delete qmsa

:: 2. (Только на Сервере) Принудительное обновление CRL после отзыва
certutil -CRL

:: 3. (Только на Сервере) Очистка кеша URL (чтобы сервер забыл старый CRL)
certutil -urlcache CRL delete
```

---

## Скрипты для тестов

Сохраните эти команды в `.bat` файлы для удобства при тестах.

### 1. `Reset_IPsec_Connections.bat`  
*(Запускать на клиенте и сервере, если что-то заглючило или поменяли настройки)*

```batch
@echo off
echo Resetting IPsec Main Mode Security Associations...
netsh advfirewall monitor delete mmsa
echo Resetting IPsec Quick Mode Security Associations...
netsh advfirewall monitor delete qmsa
echo Done.
pause
```

### 2. `Force_Revocation_Update.bat`  
*(Запускать ТОЛЬКО на СЕРВЕРЕ сразу после отзыва сертификата)*

```batch
@echo off
echo Publishing new CRL...
certutil -CRL

echo Clearing local URL cache...
certutil -urlcache CRL delete

echo Resetting active connections to force re-auth...
netsh advfirewall monitor delete mmsa
netsh advfirewall monitor delete qmsa

echo Now the revoked client should be blocked immediately.
pause
```

---

## Примечания и рекомендации

- Тестируйте в лабораторной среде до применения в продакшн.  
- Для клиентов вне домена — внимательно управляйте приватностью открытого ключа. Запрет на экспорт ключа на клиенте (снятие галочки "Mark this key as exportable") — обязательная рекомендация для защиты ключа.  
- Логирование Windows Firewall + Event Viewer помогут быстро понять, почему соединение было разрешено/отказано.  
- Ограничьте Endpoints в правилах IPsec по IP/сети — это уменьшит область воздействия и упростит отладку.  
- Если нужно масштабировать — рассмотрите автоматизацию выпуска сертификатов (например, через веб-энролмент или SCEP/NDES), но помните, что для клиентов вне домена потребуется безопасная процедура доставки PFX.  
- CRL и его доступность: убедитесь, что сервер и клиенты могут получить CRL (настройки URL в шаблоне сертификата) — иначе отзыв работать не будет.

---

## Контрольный список перед вводом в эксплуатацию

- [ ] CA настроен и работает.  
- [ ] Шаблон `IPsec_NonDomain` опубликован.  
- [ ] Клиентский PFX импортирован в `Computer\Personal`.  
- [ ] RootCA установлена в `Computer\Trusted Root Certification Authorities`.  
- [ ] На сервере настроено `IPsec_Policy_Server` и правило `RDP_Secure_Only`.  
- [ ] Стандартные RDP правила отключены.  
- [ ] `netsh advfirewall set global ipsec strongcrlcheck 1` применён (при необходимости).  
- [ ] Тестовая машина за пределами домена успешно подключается только при наличии сертификата.

---

## История изменений
- Версия: 1.0  
- Автор: Сборка руководства по сценарию "RDP через IPsec + сертификаты для non-domain clients".  
- Дата создания: автоматически.

