import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { AccordionItem, SectionCard } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/lib/responsive';
import { Radius, Shadows } from '@/constants/colors';

type SectionId =
  | 'o-que-e'
  | 'nuance'
  | 'como-usar'
  | 'formato'
  | 'geocodificacao'
  | 'faq';

interface Section {
  id: SectionId;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  navLabel: string;
  body?: React.ReactNode;
  faq?: { q: string; a: string }[];
}

export default function DocsScreen() {
  const c = useColors();
  const { rs } = useResponsive();
  const router = useRouter();

  const SECTIONS: Section[] = [
    {
      id: 'o-que-e',
      icon: 'information-circle-outline',
      title: 'O que é o ViaX:Trace?',
      navLabel: 'O que é',
      body: (
        <Body>
          O ViaX:Trace é um sistema SaaS de auditoria de rotas logísticas. Ele valida planilhas de
          entrega (XLSX ou CSV) comparando os endereços declarados pelos motoristas com as coordenadas
          GPS capturadas durante a entrega.{'\n\n'}
          Quando há discrepância entre o endereço informado e a localização real do GPS, o sistema
          classifica o item como uma <Strong>nuance</Strong> — que pode indicar erro de digitação,
          endereço incorreto, ou potencial fraude.
        </Body>
      ),
    },
    {
      id: 'nuance',
      icon: 'alert-circle-outline',
      title: 'O que é uma nuance?',
      navLabel: 'Nuance',
      body: (
        <Body>
          Uma <Strong>nuance</Strong> é detectada quando a rua/logradouro informado no endereço de
          entrega não corresponde (ou corresponde com baixa similaridade) à via real identificada
          pelas coordenadas GPS.{'\n\n'}
          <Strong>Exemplos de nuances:</Strong>{'\n'}
          • Endereço informa "Rua das Flores, 123" mas o GPS aponta para "Av. Brasil, 123"{'\n'}
          • Divergência de nome de bairro ou complemento{'\n'}
          • Endereço com erro de grafia que impede correspondência{'\n\n'}
          <Strong>Exemplos que NÃO são nuance:</Strong>{'\n'}
          • "Rua Sinagoga, 49, Travessa B" → GPS na Travessa B (o sistema reconhece padrões de via
          secundária){'\n'}
          • Variações de siglas como "Av." vs "Avenida" (normalização automática)
        </Body>
      ),
    },
    {
      id: 'como-usar',
      icon: 'cloud-upload-outline',
      title: 'Como processar uma planilha',
      navLabel: 'Como usar',
      body: (
        <Body>
          <Strong>1. Prepare o arquivo</Strong>{'\n'}
          O arquivo deve ser XLSX ou CSV com pelo menos as colunas de endereço e coordenadas GPS
          (latitude e longitude).{'\n\n'}
          <Strong>2. Vá em "Processar Rota"</Strong>{'\n'}
          No menu de navegação, clique em Processar. Faça upload do arquivo ou toque na área
          indicada.{'\n\n'}
          <Strong>3. Aguarde o processamento</Strong>{'\n'}
          O sistema processa cada endereço em tempo real via geocodificação multi-camada. O
          progresso é exibido em tempo real (SSE).{'\n\n'}
          <Strong>4. Revise os resultados</Strong>{'\n'}
          Cada linha é classificada com:{'\n'}
          • ✓ <Strong>OK</Strong> — Endereço confere com o GPS{'\n'}
          • ⚠ <Strong>Nuance</Strong> — Discrepância detectada, requer revisão{'\n\n'}
          <Strong>5. Exporte o relatório</Strong>{'\n'}
          Compartilhe o relatório CSV final com todos os resultados e detalhes de similaridade.
        </Body>
      ),
    },
    {
      id: 'formato',
      icon: 'grid-outline',
      title: 'Formato do arquivo',
      navLabel: 'Formato',
      body: (
        <Body>
          O sistema aceita planilhas com as seguintes colunas (case-insensitive):{'\n\n'}
          <Strong>Colunas obrigatórias:</Strong>{'\n'}
          • <Code>endereco</Code> / <Code>endereço</Code> / <Code>address</Code> — Endereço completo
          {'\n'}• <Code>latitude</Code> / <Code>lat</Code> — Coordenada de latitude{'\n'}
          • <Code>longitude</Code> / <Code>lon</Code> / <Code>lng</Code> — Coordenada de longitude
          {'\n\n'}
          <Strong>Colunas opcionais:</Strong>{'\n'}
          • <Code>cidade</Code> / <Code>city</Code>{'\n'}
          • <Code>bairro</Code> / <Code>neighborhood</Code>{'\n'}
          • <Code>cep</Code>{'\n\n'}
          <Strong>Formatos de endereço suportados:</Strong>{'\n'}
          • <Code>Rua das Flores, 123</Code>{'\n'}
          • <Code>Av. Brasil, 456, Ap 12</Code>{'\n'}
          • <Code>Rua Sinagoga, 49, Travessa B (Apt 1)</Code>{'\n'}
          • <Code>Farmácia Bom Jesus - Rua X, 50</Code>
        </Body>
      ),
    },
    {
      id: 'geocodificacao',
      icon: 'location-outline',
      title: 'Como funciona a geocodificação',
      navLabel: 'Geocodificação',
      body: (
        <Body>
          O sistema usa uma estratégia de <Strong>geocodificação multi-camada</Strong> para máxima
          precisão em endereços brasileiros:{'\n\n'}
          <Strong>Camada 1 — Geocodificação reversa (GPS → Rua)</Strong>{'\n'}
          1. <Strong>Photon</Strong> — OSM Photon API (rápido, sem rate limit){'\n'}
          2. <Strong>Overpass API</Strong> — Consulta direta à geometria OSM (preciso){'\n'}
          3. <Strong>Nominatim</Strong> — Fallback com dados OSM completos{'\n\n'}
          <Strong>Camada 2 — Geocodificação direta (Endereço → Coordenada)</Strong>{'\n'}
          4. <Strong>BrasilAPI</Strong> — Dados de CEP nacionais{'\n'}
          5. <Strong>Google Maps</Strong> — Fallback premium para casos difíceis{'\n\n'}
          <Strong>Normalização inteligente</Strong>{'\n'}
          Antes da comparação, o sistema normaliza siglas, remove anotações de motoristas, identifica
          POIs e promove vias secundárias (Travessa, Passagem, etc.) quando o GPS confirma que são a
          via real de entrega.
        </Body>
      ),
    },
    {
      id: 'faq',
      icon: 'help-circle-outline',
      title: 'Perguntas frequentes',
      navLabel: 'FAQ',
      faq: [
        {
          q: 'O sistema funciona para cidades pequenas do interior?',
          a: 'Sim. O sistema usa múltiplas fontes OSM que têm boa cobertura no Brasil, incluindo cidades do interior. Para endereços muito rurais, a precisão pode ser menor e o sistema indicará confiança reduzida.',
        },
        {
          q: 'O que é o limiar de similaridade?',
          a: 'O sistema calcula um percentual de correspondência entre o nome da rua informada e o nome oficial obtido pelo GPS. O limiar padrão é 68% — abaixo disso, o item é marcado como nuance. Padrões conhecidos (siglas, vias secundárias) têm tratamento especial.',
        },
        {
          q: "Por que 'Rua Sinagoga, Travessa B' não é mais nuance?",
          a: "O sistema reconhece o padrão brasileiro 'Logradouro de referência, número, Via de entrega'. Quando o GPS confirma que a via de entrega (ex: Travessa B) é a rua real, o endereço é validado automaticamente.",
        },
        {
          q: 'Quantos endereços posso processar de uma vez?',
          a: 'Não há limite técnico fixo por planilha, mas planilhas com mais de 500 endereços podem levar alguns minutos, pois cada endereço requer consultas a APIs externas. O progresso é exibido em tempo real.',
        },
        {
          q: 'Os dados são armazenados com segurança?',
          a: 'Sim. Todo o processamento ocorre em nosso servidor seguro. Os arquivos são armazenados de forma criptografada e apenas você tem acesso aos seus resultados.',
        },
      ],
    },
  ];

  const [active, setActive] = useState<SectionId>('o-que-e');
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<SectionId, number>>({} as any);

  const goTo = (id: SectionId) => {
    setActive(id);
    const y = sectionOffsets.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: y - 12, animated: true });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(48), gap: rs(14) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 99,
              backgroundColor: c.accentDim,
              borderWidth: 1,
              borderColor: 'rgba(212,82,26,0.2)',
              marginBottom: 10,
            }}
          >
            <Ionicons name="document-text-outline" size={12} color={c.accent} />
            <Text
              style={{
                color: c.accent,
                fontFamily: 'Poppins_700Bold',
                fontSize: rs(10),
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Documentação
            </Text>
          </View>
          <Text
            style={{
              color: c.text,
              fontFamily: 'Poppins_700Bold',
              fontSize: rs(24),
              letterSpacing: -0.6,
              marginBottom: 6,
            }}
          >
            Guia do ViaX:Trace
          </Text>
          <Text
            style={{
              color: c.textFaint,
              fontFamily: 'Poppins_400Regular',
              fontSize: rs(13),
              lineHeight: rs(20),
            }}
          >
            Tudo que você precisa saber para auditar rotas logísticas com precisão e eficiência.
          </Text>
        </View>

        {/* Sticky-ish nav row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          {SECTIONS.map((s) => {
            const on = active === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => goTo(s.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 99,
                  borderWidth: 1,
                  borderColor: on ? c.accent : c.border,
                  backgroundColor: on ? c.accentDim : c.surface2,
                }}
              >
                <Ionicons name={s.icon} size={13} color={on ? c.accent : c.textMuted} />
                <Text
                  style={{
                    color: on ? c.accent : c.textMuted,
                    fontFamily: on ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
                    fontSize: rs(11.5),
                  }}
                >
                  {s.navLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <View
            key={s.id}
            onLayout={(e) => {
              sectionOffsets.current[s.id] = e.nativeEvent.layout.y;
            }}
          >
            <SectionCard icon={s.icon} title={s.title}>
              {s.faq ? (
                <View>
                  {s.faq.map((f, i) => (
                    <AccordionItem key={i} title={f.q}>
                      {f.a}
                    </AccordionItem>
                  ))}
                </View>
              ) : (
                s.body
              )}
            </SectionCard>
          </View>
        ))}

        {/* Quick nav */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          {[
            { href: '/(tabs)/process', label: 'Processar Rota', desc: 'Upload de planilha', icon: 'cloud-upload-outline' as const },
            { href: '/(tabs)/history', label: 'Histórico', desc: 'Ver análises anteriores', icon: 'time-outline' as const },
            { href: '/(tabs)/settings', label: 'Configurações', desc: 'Valor por rota, metas', icon: 'settings-outline' as const },
          ].map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => ({
                flexBasis: '48%',
                flexGrow: 1,
                padding: rs(14),
                borderRadius: Radius.md,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: pressed ? c.accent : c.borderStrong,
                gap: 6,
                ...Shadows.sm,
              })}
            >
              <Ionicons name={item.icon} size={20} color={c.accent} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: rs(13),
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  color: c.textFaint,
                  fontFamily: 'Poppins_400Regular',
                  fontSize: rs(11),
                }}
              >
                {item.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text
          style={{
            color: c.textFaint,
            fontFamily: 'Poppins_400Regular',
            fontSize: rs(11),
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          ViaX:Trace v8 · Auditoria de rotas logísticas
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const { rs } = useResponsive();
  return (
    <Text
      style={{
        color: c.textMuted,
        fontFamily: 'Poppins_400Regular',
        fontSize: rs(13),
        lineHeight: rs(22),
      }}
    >
      {children}
    </Text>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        color: c.text,
        fontFamily: 'Poppins_600SemiBold',
      }}
    >
      {children}
    </Text>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        color: c.text,
        fontFamily: 'Poppins_500Medium',
        backgroundColor: c.surface2,
      }}
    >
      {' '}
      {children}{' '}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
