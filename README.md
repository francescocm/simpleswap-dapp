# SimpleSwap DApp - Trabajo Práctico Módulo 4

Este repositorio contiene el proyecto final para el Módulo 4 del curso de Blockchain. El objetivo es construir un frontend completamente funcional y un conjunto de tests para un contrato inteligente de intercambio de tokens (SimpleSwap) desarrollado en el Módulo 3.

**Live Demo:** [URL de tu despliegue en Vercel se insertará aquí]

---

## ▶️ Características Principales

La DApp implementa todas las funcionalidades requeridas para un exchange descentralizado básico:

*   ✅ **Conexión con Billetera:** Se integra con MetaMask para conectar la billetera del usuario.
*   ✅ **Swap Bidireccional:** Permite intercambiar Token A por Token B y viceversa.
*   ✅ **Estimación de Salida en Tiempo Real:** Calcula y muestra la cantidad estimada de tokens a recibir antes de realizar la transacción.
*   ✅ **Visualización de Precio:** Muestra el tipo de cambio actual entre los dos tokens, que se actualiza después de cada swap.
*   ✅ **Aprobación Dinámica de Tokens:** Si el contrato no tiene los permisos necesarios para realizar el swap, la DApp solicita automáticamente al usuario que firme una transacción de `approve` antes de continuar.
*   ✅ **Notificaciones de Estado:** Proporciona feedback claro al usuario durante todo el ciclo de vida de la transacción.

---

## 🛠️ Stack Tecnológico

*   **Smart Contracts:** Solidity `^0.8.0`
*   **Entorno de Desarrollo:** Hardhat
*   **Librería Frontend:** Ethers.js
*   **Testing:** Hardhat (con Chai & Ethers)
*   **Dependencias de Contratos:** OpenZeppelin Contracts (para MockERC20)
*   **Frontend:** HTML5, CSS3, JavaScript (ESM)
*   **Despliegue:** Vercel

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

Siga estos pasos para configurar y ejecutar el proyecto en su máquina local.

### Prerrequisitos

*   Node.js (v18 o superior)
*   NPM
*   MetaMask (extensión del navegador)

### 1. Clonar el Repositorio

```bash
git clone [URL de tu repositorio de GitHub se insertará aquí]
cd nombre-del-repositorio

2. Instalar Dependencias
Instale todas las dependencias del proyecto necesarias para Hardhat.
bash
npm install
3. Iniciar el Nodo Local de Hardhat
Este comando iniciará una blockchain local en su máquina. Dejar esta terminal abierta.
bash
npx hardhat node
Al iniciarse, Hardhat le proporcionará una lista de 20 cuentas de prueba con sus claves privadas. Copie la clave privada (Private Key) de la primera cuenta (0xf39...), ya que la necesitaremos para MetaMask.

4. Desplegar los Contratos
Abra una segunda terminal y ejecute el script de despliegue. Este script desplegará los contratos de tokens y el SimpleSwap, acuñará tokens iniciales, establecerá los permisos (approve) y añadirá liquidez inicial al pool.
bash
npx hardhat run scripts/deploy.js --network localhost

5. Configurar MetaMask
Abra MetaMask y seleccione "Añadir red manualmente".
Configure la red de Hardhat con los siguientes datos:
Nombre de la red: Hardhat Local
Nueva URL de RPC: http://127.0.0.1:8545
ID de cadena: 31337
Símbolo de moneda: ETH
Importe la cuenta del desplegador. Haga clic en el círculo de su cuenta -> "Importar cuenta" y pegue la clave privada que copió en el paso 3. Esta cuenta tendrá TKA y TKB para intercambiar.

6. Ejecutar el Frontend
El frontend es un sitio estático. La forma más fácil de servirlo es usando la extensión Live Server en Visual Studio Code.
Abra el proyecto en VS Code.
Haga clic derecho sobre el archivo frontend/index.html.
Seleccione "Open with Live Server".
¡Listo! La DApp se abrirá en su navegador, lista para conectar su cuenta de MetaMask importada y realizar intercambios.