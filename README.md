# SimpleSwap DApp - Trabajo Práctico Final

Este repositorio contiene el código fuente para el Trabajo Práctico Final del Módulo 4, que consiste en una DApp de intercambio descentralizado (DEX) simple construida sobre la red de prueba Sepolia.

---

## 🚀 DApp Desplegada en Vercel

**Puedes interactuar con la aplicación en vivo aquí:**

[**https://simpleswap-dapp.vercel.app/**](https://simpleswap-dapp.vercel.app/)

---

## 👨‍🏫 Cómo Usar la DApp (Guía para el usuario)

Para probar la DApp, por favor sigue estos pasos:

1.  **Instalar MetaMask:** Asegúrate de tener la extensión de navegador MetaMask instalada.
2.  **Seleccionar Red Sepolia:** Abre MetaMask y cambia la red a "Sepolia Testnet".
3.  **Usar la Cuenta Correcta:** La DApp funcionará con cualquier cuenta, pero **para tener un balance de tokens (TKA y TKB) y poder añadir liquidez o hacer swaps, es necesario usar la cuenta que desplegó los contratos**. Esta cuenta ya posee los tokens iniciales. La clave privada de esta cuenta se encuentra en el archivo `.env` del proyecto.
4.  **Conectar Billetera:** Abre el enlace de la DApp y haz clic en "Connect Wallet".
5.  **Probar Funcionalidades:**
    *   **Swap:** Intercambia tokens TKA por TKB (y viceversa) en la pestaña "Swap".
    *   **Pool:** Añade más liquidez al pool en la pestaña "Pool".

---

## ✨ Características

*   **Contratos Inteligentes en Solidity:** Contrato `SimpleSwap.sol` optimizado y con documentación NatSpec completa.
*   **Conexión con MetaMask:** Integración con Ethers.js para conectar billeteras de forma segura.
*   **Intercambio de Tokens (Swap):** Permite a los usuarios intercambiar entre dos tokens ERC20 (TKA y TKB).
*   **Provisión de Liquidez:** Permite a los usuarios añadir liquidez al pool de intercambio.
*   **Cobertura de Tests:** Pruebas exhaustivas realizadas con Hardhat y Chai, superando el 50% de cobertura requerido.

---

## 🛠️ Stack Tecnológico

*   **Blockchain:** Ethereum (Sepolia Testnet)
*   **Contratos Inteligentes:** Solidity `^0.8.0`
*   **Entorno de Desarrollo:** Hardhat
*   **Librería Frontend:** Ethers.js
*   **Despliegue:** Vercel

---

## 📄 Información de Despliegue (Sepolia Testnet)

Las direcciones de los contratos desplegados en la red de prueba Sepolia son las siguientes:

*   **Red:** `Sepolia Testnet`
*   **SimpleSwap Contract:** [`0x2438fAED6Aac675E64625E900B25B25956403163`](https://sepolia.etherscan.io/address/0x2438fAED6Aac675E64625E900B25B25956403163)
*   **Token A (TKA):** [`0x07Ae78493B8B375c5cD73e7244c9538Af5F26d42`](https://sepolia.etherscan.io/address/0x07Ae78493B8B375c5cD73e7244c9538Af5F26d42)
*   **Token B (TKB):** [`0xB57aA4d3cE23f629B3E7dBaf6d41cFd938dce8C3`](https://sepolia.etherscan.io/address/0xB57aA4d3cE23f629B3E7dBaf6d41cFd938dce8C3)
*   **Cuenta Deployer:** [`0xef50261Ab49E27183503AACdEd9f4E9b9F033445`](https://sepolia.etherscan.io/address/0xef50261Ab49E27183503AACdEd9f4E9b9F033445)

---

## 💻 Desarrollo Local

Si deseas ejecutar este proyecto localmente:

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/francescocm/simpleswap-dapp.git
    ```
2.  Instala las dependencias:
    ```bash
    cd simpleswap-dapp
    npm install
    ```
3.  Crea un archivo `.env` en la raíz del proyecto y añade tu `PRIVATE_KEY` y tu `ALCHEMY_API_KEY`.
4.  Para ejecutar los tests:
    ```bash
    npx hardhat test
    ```
5.  Para desplegar en una red (ej. Sepolia):
    ```bash
    npx hardhat run scripts/deploy.js --network sepolia
    ```

---

## ✒️ Autor

*   **Francesco Centarti Maestu** - [francescocm](https://github.com/francescocm)
