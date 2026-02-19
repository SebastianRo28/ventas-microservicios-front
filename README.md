# 🌐 README – FRONTEND  
(Repositorio: `ventas-microservicios-front`)

```markdown
# 🖥 Retail System - Frontend (Angular 16)

Proyecto desarrollado como parte de prueba técnica.  
Aplicación Angular que consume microservicios .NET 8 utilizando JWT e interceptores.

---

# 🚀 Tecnologías utilizadas

- Angular 16.2
- TypeScript
- Bootstrap 5
- HttpClient
- Interceptor JWT
- Arquitectura modular

---

# 🧱 Estructura del proyecto

src/app/
├── core/
│ ├── api/
│ ├── jwt.interceptor.ts
├── features/
│ ├── purchases/
│ ├── sales/
│ ├── products/
│ ├── kardex/


---

# 🔐 Autenticación

- Se utiliza JWT almacenado en `localStorage`.
- Se implementó `HttpInterceptor` para agregar automáticamente:

Authorization: Bearer {token}


- Si el token expira, el interceptor puede regenerarlo automáticamente.

---

# 📄 Vistas implementadas

## 🛒 Registrar Compra
- Permite agregar múltiples productos.
- Modal para registrar nuevo producto.
- Calcula subtotal dinámicamente.
- Envía datos a Purchases.Api.
- Genera movimiento tipo ENTRADA.

## 💰 Registrar Venta
- Muestra precio venta.
- Calcula:
  - Subtotal
  - IGV
  - Total
- Valida stock disponible.
- Genera movimiento tipo SALIDA.

## 📊 Kardex
- Lista productos con:
  - Stock actual
  - Costo
  - Precio Venta
- Modal para ver movimientos del producto.

---

# ⚙ Cómo ejecutar el proyecto

## 1️⃣ Instalar dependencias

```bash
npm install
npm install bootstrap
