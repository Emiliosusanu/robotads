# 📒 RobotAds – Amazon Ads API Entegrasyon Günlüğü

## 🎯 Projenin Hedefi

Amazon Ads API ile çalışan bir otomasyon sistemi:

* Her kullanıcı kendi Amazon hesabını bağlar
* RobotAds her 24 saatte bir optimizasyon yapar
* ACOS, CTR gibi kurallara göre bid değiştirir veya keyword durdurur

---

## ✅ 1. MÜŞTERİDEN ALDIKLARIMIZ

| Bilgi Türü                       | Değer / Notlar                             |
| -------------------------------- | ------------------------------------------ |
| **Amazon Ads API Client ID**     | `amzn1.application-oa2-client.91aebdc2...` |
| **Amazon Ads API Client Secret** | `amzn1.oa2-cs.v1.4d3bbd6d2d459e3...`       |
| **Allowed Origin**               | `http://localhost:5173/` (geliştirme için) |
| **Allowed Return URL**           | `http://localhost:5173/amazon-callback`    |

---

## ✅ 2. GELİŞTİRİCİ TARAFINDA YAPILANLAR

### 🔹 2.1. Amazon Ads OAuth Bağlantısı

* [x] OAuth bağlantı linki oluşturuldu

  ```
  https://www.amazon.com/ap/oa?client_id=...&scope=advertising::campaign_management profile&redirect_uri=http://localhost:5173/amazon-callback&response_type=code&state=xyz
  ```
* [x] Müşteri kendi Amazon hesabıyla login oldu
* [x] `code` değeri alındı

### 🔹 2.2. İlk Token Alımı (`code → access_token + refresh_token`)

* [x] Postman ile `/auth/o2/token` endpoint’ine `POST` atıldı
* [x] Başarıyla `access_token` ve `refresh_token` alındı
