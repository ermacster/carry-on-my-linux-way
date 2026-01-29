# Защита RDP через IPsec с использованием сертификатов (без домена)

Этот гайд описывает настройку блокировки доступа к RDP (порт 3389) для всех устройств, не имеющих валидного машинного сертификата. Сценарий включает сервер (DC + CA) и клиентский ПК вне домена.

## Среда
*   **Server:** Windows Server 2016 (Role: DC, CA, NPS/Firewall).
*   **Client:** Windows 10/11 (Workgroup, не в домене).
*   **Цель:** RDP соединение возможно только при наличии установленного сертификата.

---

## Этап 1: Настройка Центра Сертификации (CA)

### 1. Установка ролей
1.  **Server Manager** -> **Add Roles and Features**.
2.  Выбрать роль **Active Directory Certificate Services**.
3.  В Role Services отметить:
    *   Certification Authority
    *   Certification Authority Web Enrollment (для удобства, опционально)
4.  После установки пройти **Post-deployment configuration**:
    *   Type: Enterprise CA.
    *   Type: Root CA.
    *   Private Key: Create a new private key.
    *   Hash: SHA256.
    *   Validity: 5 лет.

### 2. Создание шаблона сертификата (Для ПК вне домена)
Т.к. клиент не в домене, нам нужно разрешить указывать имя компьютера вручную.

1.  `Win + R` -> `certsrv.msc`.
2.  **Certificate Templates** -> ПКМ -> **Manage**.
3.  Найти шаблон **Workstation Authentication** -> ПКМ -> **Duplicate Template**.
4.  **Вкладка General:**
    *   Name: `IPsec_NonDomain`.
    *   Validity: по желанию (например, 1 год).
5.  **Вкладка Request Handling:**
    *   [x] **Allow private key to be exported** (Нужно, чтобы перенести сертификат на клиент).
6.  **Вкладка Subject Name (ВАЖНО):**
    *   Выбрать: **Supply in the request**.
7.  **Вкладка Security:**
    *   Убедиться, что у Admin/Authenticated Users есть права **Enroll**.
8.  Сохранить шаблон.
9.  В консоли CA: **Certificate Templates** -> ПКМ -> **New** -> **Certificate Template to Issue** -> Выбрать `IPsec_NonDomain`.

---

## Этап 2: Генерация и Экспорт сертификатов

Выполняется на Сервере.

### 1. Выпуск сертификата для клиента
1.  `mmc` -> Add Snap-in -> **Certificates (Computer Account, Local Computer)**.
2.  **Personal** -> ПКМ -> **All Tasks** -> **Request New Certificate**.
3.  Выбрать шаблон `IPsec_NonDomain`.
4.  Нажать **"More information is required..."**:
    *   Subject Name Type: **Common Name**.
    *   Value: Имя клиента (например, `Client-Laptop`).
5.  Нажать **Enroll**.

### 2. Экспорт для переноса
1.  **Сертификат Клиента:**
    *   Найти в Personal выпущенный сертификат.
    *   ПКМ -> Export -> **Yes, export the private key** -> PFX.
    *   Задать пароль. Сохранить как `Client.pfx`.
2.  **Корневой Сертификат (CA):**
    *   Trusted Root Certification Authorities -> Certificates.
    *   Найти свой CA.
    *   ПКМ -> Export -> **No, do not export private key** -> DER (.CER).
    *   Сохранить как `RootCA.cer`.

---

## Этап 3: Настройка Клиента

Перенести файлы `Client.pfx` и `RootCA.cer` на клиентский ПК.

1.  `mmc` -> Certificates (Computer Account!).
2.  **Импорт Корневого:**
    *   Trusted Root Certification Authorities -> Import -> `RootCA.cer`.
3.  **Импорт Личного:**
    *   Personal -> Import -> `Client.pfx`.
    *   Ввести пароль.
    *   **ВАЖНО:** Снять галочку **"Mark this key as exportable"** (Защита от копирования пользователем).

---

## Этап 4: Настройка IPsec на Сервере

`Win + R` -> `wf.msc`

### 1. Правило безопасности подключения (Connection Security Rule)
Создает шифрованный туннель (Main Mode).

*   **Rule Type:** Custom.
*   **Endpoints:** Any IP <-> Any IP.
*   **Authentication:**
    *   Method: **Computer certificate from this CA**.
    *   Requirements: **Require authentication for inbound and outbound**.
*   **Profile:** Domain, Private, Public.
*   **Name:** `IPsec_Policy_Server`.

### 2. Правило Брандмауэра (Inbound Rule)
Блокирует порт 3389, если нет туннеля.

*   **Rule Type:** Port (TCP 3389).
*   **Action:** **Allow the connection if it is secure**.
    *   Customize -> **Allow the connection if it is authenticated and integrity-protected**. (Иногда "Require Encryption" сбоит с RDP, целостности достаточно, т.к. сам RDP шифрован).
*   **Users/Computers:** Any / Any.
*   **Name:** `RDP_Secure_Only`.

### 3. Зачистка (КРИТИЧНО)
Найти и **Выключить (Disable)** все стандартные правила RDP, которые светятся зеленым, особенно:
*   `Remote Desktop - User Mode (TCP-In)`
*   `Remote Desktop - Shadow (TCP-In)`
*   `Remote Desktop - User Mode (UDP-In)`

---

## Этап 5: Настройка IPsec на Клиенте

`Win + R` -> `wf.msc`

### 1. Правило безопасности подключения
*   **Endpoint 1:** Any IP.
*   **Endpoint 2:** **Server IP Address** (чтобы не шифровать весь интернет).
*   **Authentication:** Computer certificate from this CA.
*   **Name:** `IPsec_to_Server`.

*Правила Inbound на клиенте не нужны.*

---

## Этап 6: Hardening (Защита от отозванных сертификатов)

Чтобы сервер перестал пускать клиента сразу после отзыва сертификата, нужно включить строгую проверку CRL.

**На Сервере (CMD Admin):**
```cmd

netsh advfirewall set global ipsec strongcrlcheck 1

##  Доп этап: Дебаг и Сброс кеша 
Если сертификат отозван, но доступ есть, или сертификат обновлен, но доступа нет — нужно сбросить кеш IPsec и CRL.
Команды (на Сервере и Клиенте):
code
Cmd
:: 1. Удаление сохраненных ассоциаций безопасности (разрыв соединений)
netsh advfirewall monitor delete mmsa
netsh advfirewall monitor delete qmsa

:: 2. (Только на Сервере) Принудительное обновление CRL после отзыва
certutil -CRL

:: 3. (Только на Сервере) Очистка кеша URL (чтобы сервер забыл старый CRL)
certutil -urlcache CRL delete
code
Code
---

### Скрипты (для сохранения в файлы)

Сохрани эти команды в `.bat` файлы, чтобы не вбивать их руками каждый раз при тестах.

#### 1. `Reset_IPsec_Connections.bat`
*(Запускать на клиенте и сервере, если что-то заглючило или поменяли настройки)*

```batch
@echo off
echo Resetting IPsec Main Mode Security Associations...
netsh advfirewall monitor delete mmsa
echo Resetting IPsec Quick Mode Security Associations...
netsh advfirewall monitor delete qmsa
echo Done.
pause
2. Force_Revocation_Update.bat
(Запускать ТОЛЬКО на Сервере сразу после того, как сделал Revoke сертификату)
code
Batch
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
