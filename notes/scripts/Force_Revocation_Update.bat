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