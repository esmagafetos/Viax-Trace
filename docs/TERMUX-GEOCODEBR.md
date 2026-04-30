# GeocodeR BR no celular (Termux + proot-distro)

Guia para rodar o microserviço **GeocodeR BR** (R + Plumber + dados oficiais
do CNEFE/IBGE) num celular Android usando Termux. Esta é uma alternativa ao
serviço Render — útil em redes restritas, processamento offline em campo, ou
para auditorias sem custo de cloud.

> **Atenção:** Termux + Android impõe várias limitações que **precisam ser
> mitigadas** para o serviço sobreviver mais que ~30 min. Leia a seção
> "Limitações conhecidas" antes de instalar.

---

## 1 · Pré-requisitos

| Item                    | Versão mínima      | Observação                                               |
| ----------------------- | ------------------ | -------------------------------------------------------- |
| Android                 | 7.0 (API 24)+      | Recomendado 11+ para o storage estável                   |
| CPU                     | ARMv8 / aarch64    | binários R 4.5 só existem para essa arquitetura          |
| RAM livre               | ≥ 4 GB             | Pico de 1,5–2 GB durante o load do CNEFE                 |
| Espaço livre            | ≥ 5 GB             | Ubuntu rootfs (~700 MB) + R + CNEFE (~3 GB descomp.)     |
| **Termux** (F-Droid!)   | 0.118+             | **Não use o da Play Store** (descontinuado, sem updates) |
| **Termux:API** (opc.)   | qualquer           | Necessário para `termux-wake-lock` automático            |
| **Termux:Boot** (opc.)  | qualquer           | Necessário para autostart no boot do celular             |

> **Crucial:** instale Termux do **F-Droid** ou da página oficial
> [github.com/termux/termux-app/releases](https://github.com/termux/termux-app/releases).
> A versão da Play Store **não recebe atualizações desde 2020** e tem bugs em
> Android 7+.

---

## 2 · Instalação

```bash
pkg update && pkg upgrade -y
pkg install -y bash curl proot-distro
cd ~ && git clone https://github.com/<seu-fork>/viax-system.git
bash ~/viax-system/install-geocodebr-termux.sh
```

O script:

1. Instala o Ubuntu 24.04 (noble) via `proot-distro`
2. Configura o repositório CRAN apt e instala R 4.5
3. Instala todos os pacotes R como **binários ARM64 pré-compilados**
   (r-universe.dev) — zero compilação C++, sem risco de OOM-kill
4. Copia `plumber.R` e `start.R` para dentro do rootfs
5. Gera `start-geocodebr.sh` com todas as mitigações Termux pré-aplicadas
6. Configura autostart no boot via Termux:Boot (se a pasta existir)

Tempo estimado: **10–25 min** numa rede decente (depende do CDN do r-universe).

---

## 3 · Limitações conhecidas — e como mitigá-las

Estas são as quatro razões pelas quais "rodar Plumber no celular dá certo no
laboratório e morre na vida real". Todas estão tratadas pelo install ou pelo
`start-geocodebr.sh`, mas algumas precisam de ação **uma vez** do usuário.

### 3.1 · Phantom Process Killer (Android 12+) ⚠️ *killer #1*

**Sintoma:** o serviço inicia, responde requests por 5–40 min, e some sem
deixar log nem mensagem de erro. Acontece especialmente quando outros apps
rodam em paralelo.

**Causa:** desde Android 12, o sistema mata qualquer app que tenha mais de
**32 processos filhos**. R + Plumber + DuckDB + Arrow facilmente passam disso.
Quando um filho excede o orçamento de CPU "fantasma", **todo o Termux é
encerrado** sem aviso.

**Mitigação (precisa ser feita 1 vez):** desative o monitor de phantom
process via ADB.

1. Ative *Opções de desenvolvedor* no Android (toque 7× em "Número da
   versão" em Ajustes → Sobre).
2. Ative *Depuração USB*.
3. Conecte o celular num PC com `adb` instalado.
4. Rode:

   ```bash
   adb shell settings put global settings_enable_monitor_phantom_procs 0
   adb shell device_config put activity_manager max_phantom_processes 2147483647
   ```

5. (opcional) `adb shell device_config set_sync_disabled_for_tests persistent`
   para que a config sobreviva a reboots.

> Sem ADB? Não há atalho. Você pode usar Shizuku + Wireless ADB, ou aceitar
> que o serviço morrerá periodicamente e configurar o autostart (item 4).

### 3.2 · Doze mode / Wake lock (Android 6+) ⚠️ *killer #2*

**Sintoma:** com a tela apagada, requests demoram 10–30 s ou dão timeout. CPU
foi colocada em "freeze" pelo Android para economizar bateria.

**Mitigação:** o `start-geocodebr.sh` chama `termux-wake-lock` automaticamente
quando o Termux:API está instalado. Se não estiver:

```bash
pkg install termux-api
# E instale o app "Termux:API" do F-Droid (apk separado, não é só o pacote)
```

Alternativa manual: puxe a barra de notificação enquanto o Termux estiver
aberto e toque em **Acquire Wakelock**. O ícone de cadeado significa que está
ativo.

### 3.3 · DNS perdido em proot-distro (issue #264) ⚠️ *killer #3*

**Sintoma:** dentro do Ubuntu, `ping 1.1.1.1` funciona mas `ping google.com`
falha. R não consegue baixar o CNEFE.

**Causa:** [proot-distro#264](https://github.com/termux/proot-distro/issues/264)
— em alguns updates do proot-distro, o `/etc/resolv.conf` do rootfs é
zerado.

**Mitigação:** o `start-geocodebr.sh` re-escreve `/etc/resolv.conf` no rootfs
antes de iniciar o R. Se você fizer login manual com `proot-distro login
ubuntu` e perceber que a rede falha, rode:

```bash
echo "nameserver 1.1.1.1" > /etc/resolv.conf
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
```

### 3.4 · Battery Optimization (todos os Android)

**Sintoma:** Termux congela depois de algumas horas mesmo com wake lock.

**Mitigação:** Ajustes → Apps → Termux → Bateria → **Sem restrições**.
No Samsung One UI: também desative em "Apps em modo suspenso" e "Apps que
nunca dormem".

---

## 4 · Operação

### Iniciar manualmente

```bash
bash ~/viax-system/start-geocodebr.sh
# Aguarde até ver:  Running plumber API at http://0.0.0.0:8002
```

Em outro app, configure o ViaX para usar `http://localhost:8002`. O
`localhost` do Android é compartilhado entre apps no mesmo dispositivo.

### Rodar em background

```bash
pkg install tmux
tmux new -s geocodebr
bash ~/viax-system/start-geocodebr.sh
# Ctrl+B, depois D — desconecta sem matar o serviço
```

Para reanexar: `tmux attach -t geocodebr`. Combinado com wake lock + phantom
killer desligado, isso roda por dias.

### Autostart no boot do Android

Instale **Termux:Boot** do F-Droid e abra o app uma vez (isso registra o
receiver `BOOT_COMPLETED`). O install já criou `~/.termux/boot/start-geocodebr`.

> Algumas ROMs (Xiaomi, Huawei, Vivo) requerem ativar manualmente "Autostart"
> para o Termux:Boot. Confira em Ajustes de bateria/permissões.

---

## 5 · Tamanho real do CNEFE

O `geocodebr` baixa os dados sob demanda na primeira chamada que usa um
estado:

| Cobertura          | Comprimido | Descompactado |
| ------------------ | ---------- | ------------- |
| Estado individual  | ~80–250 MB | ~250–800 MB   |
| Brasil inteiro     | ~1,5 GB    | ~3 GB         |

Cache fica em `/root/.cache/R/geocodebr/` (dentro do rootfs Ubuntu). Para
limitar o consumo, configure `GEOCODEBR_INTERIOR=false` ou pré-baixe apenas os
estados que sua operação usa.

---

## 6 · Troubleshooting rápido

| Sintoma                                    | Diagnóstico                       | Remédio                                            |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------- |
| Serviço some após 30 min, sem log          | Phantom Process Killer            | ADB → seção 3.1                                    |
| Requests timeout com tela apagada          | Doze mode                         | `termux-wake-lock` → seção 3.2                     |
| `R` no Ubuntu não baixa CNEFE              | DNS no proot                      | Re-escrever `/etc/resolv.conf` → seção 3.3         |
| Termux some sozinho à noite                | Battery optimizer                 | "Sem restrições" → seção 3.4                       |
| `Cannot allocate memory`                   | Outro app comeu RAM               | Feche apps, ou reduza ESTADOS no cache             |
| `address already in use`                   | Já tem GeocodeR rodando           | `tmux ls` ou `pkill -f Rscript`                    |
| Erro 502 ao chamar do ViaX no PC           | localhost não é compartilhado     | Use `http://<IP-celular>:8002`, abra a porta no firewall |

---

## 7 · Por que não Docker / chroot / kernel module?

- **Docker exige kernel features** (cgroups v2, namespaces) que o kernel
  Android **não expõe ao userspace**. Não tem como.
- **chroot** exige root. proot-distro emula com `LD_PRELOAD` e funciona
  sem root.
- **Kernel modules / Magisk** quebra a auditoria — fora de escopo.

`proot-distro` é o único caminho não-root que funciona em Android stock 2025.

---

## 8 · Referências

- [r-universe binaries (noble-aarch64)](https://docs.r-universe.dev/install/binaries.html)
- [geocodebr no CRAN](https://ipeagit.github.io/geocodebr/)
- [Termux storage permission deep dive](https://termuxtools.com/termux-storage-permission-explained-2/)
- [proot-distro DNS bug #264](https://github.com/termux/proot-distro/issues/264)
- [Android 14 Termux issues #3855](https://github.com/termux/termux-app/issues/3855)
- [Termux:Boot README](https://github.com/termux/termux-boot)
- [Disable Phantom Process Killer (kskroyal)](https://kskroyal.com/disable-phantom-process-killer-in-android-12-13/)
