import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Share,
  Image,
} from 'react-native';
import CheckBox from 'expo-checkbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';


const Stack = createStackNavigator();


// Configuração de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


// Função para agendar notificações
const agendarNotificacao = async (item) => {
  if (!Device.isDevice) {
    console.warn('Notificações só funcionam em dispositivos físicos.');
    return;
  }

  if (!item.validade || item.validade === 'Sem validade') return;

  const [dia, mes, ano] = item.validade.split('/').map(Number);
  const validade = new Date(ano, mes - 1, dia);
  const agora = new Date();

  // Verificar se a validade está no futuro
  if (validade > agora) {
    const diferencaMilissegundos = validade - agora;
    const diferencaDias = Math.round(diferencaMilissegundos / (1000 * 60 * 60 * 24));

    if (diferencaDias <= 3 && diferencaDias > 0) {  // Notificar se faltam 3 ou menos dias
      const mensagem = `Faltam ${diferencaDias} dias para o item "${item.nome}" vencer (${item.validade}).`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Validade Próxima!',
          body: mensagem,
        },
        trigger: {
          seconds: diferencaMilissegundos / 1000, // Tempo em segundos
        },
      });
    }
  }
};

// Função para salvar o item e agendar notificação
const salvarItemEAgendar = async (item, itens, setItens, lista) => {
  const atualizado = [...itens, item];
  setItens(atualizado);
  salvarItensNaLista(atualizado, lista);
  await agendarNotificacao(item);
};

// Função para compartilhar lista no WhatsApp
const compartilharLista = async (lista) => {
  const mensagem = lista.itens
    .map(
      (item) =>
        `${item.nome} (${item.quantidade || 1}) - ${
          item.validade || 'Sem validade'
        }`
    )
    .join('\n');

  try {
   await Share.share({
  message: `Lista: ${lista.nome}\n\n${mensagem}`,
    });
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível compartilhar a lista.');
    console.error('Erro ao compartilhar:', error);
  }
};

// Função para salvar itens na lista
const salvarItensNaLista = async (novosItens, lista) => {
  const listas = await carregarListas();
  const listaAtualizada = listas.map((l) =>
    l.nome === lista.nome ? { ...l, itens: novosItens } : l
  );
  await salvarListas(listaAtualizada);
};


// Funções de armazenamento
const carregarListas = async () => {
  try {
    const listasSalvas = await AsyncStorage.getItem('@listas');
    return listasSalvas ? JSON.parse(listasSalvas) : [];
  } catch (e) {
    console.error('Erro ao carregar listas:', e);
    return [];
  }
};

const salvarListas = async (listas) => {
  try {
    await AsyncStorage.setItem('@listas', JSON.stringify(listas));
  } catch (e) {
    console.error('Erro ao salvar listas:', e);
  }
};

const carregarHistorico = async () => {
  try {
    const historicoSalvo = await AsyncStorage.getItem('@historico');
    return historicoSalvo ? JSON.parse(historicoSalvo) : [];
  } catch (e) {
    console.error('Erro ao carregar histórico:', e);
    return [];
  }
};

const salvarNoHistorico = async (item) => {
  try {
    const historicoSalvo = await carregarHistorico();
    const novoHistorico = [...historicoSalvo, item];
    await AsyncStorage.setItem('@historico', JSON.stringify(novoHistorico));
  } catch (e) {
    console.error('Erro ao salvar no histórico:', e);
  }
};

// Função para formatar e validar datas
const formatarData = (texto) => {
  const textoLimpo = texto.replace(/\D/g, '');
  let dataFormatada = textoLimpo;

 if (textoLimpo.length > 2) {
  dataFormatada = `${textoLimpo.slice(0, 2)}/${textoLimpo.slice(2)}`;
}
if (textoLimpo.length > 4) {
  dataFormatada = `${textoLimpo.slice(0, 2)}/${textoLimpo.slice(2, 4)}/${textoLimpo.slice(4)}`;
}

  return dataFormatada;
};

const validarData = (data) => {
  if (!data.trim()) return true;
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (!regex.test(data)) return false;

  const [dia, mes, ano] = data.split('/').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);

  return (
    dataObj.getFullYear() === ano &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getDate() === dia
  );
};
// Tela Inicial
function InicioScreen({ navigation }) {
  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <View style={styles.imageContainer}>
        {/* Exibindo a imagem da pasta assets */}
        <Image
          source={require('./assets/icon.png')}  // Caminho para a imagem
          style={styles.icon}                    // Estilos para a imagem
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Gerenciar Listas')}
      >
        <Text style={styles.buttonText}>Iniciar</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}


// Tela Gerenciar Listas
function GerenciarListasScreen({ navigation }) {
  const [listas, setListas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editarLista, setEditarLista] = useState(null);
  const [novoNome, setNovoNome] = useState('');

  useEffect(() => {
    const atualizarListas = async () => {
      const listasCarregadas = await carregarListas();
      setListas(listasCarregadas);
    };
    atualizarListas();
  }, []);

  const criarNovaLista = async () => {
    if (!novoNome.trim()) {
      Alert.alert('Erro', 'Insira um nome para a lista.');
      return;
    }
    const novasListas = [...listas, { nome: novoNome, itens: [] }];
    setListas(novasListas);
    await salvarListas(novasListas);
    setNovoNome('');
    setModalVisible(false);
  };

  const salvarAlteracoesLista = async () => {
    const atualizadas = listas.map((lista) =>
      lista === editarLista ? { ...lista, nome: novoNome } : lista
    );
    setListas(atualizadas);
    await salvarListas(atualizadas);
    setEditarLista(null);
    setNovoNome('');
    setModalVisible(false);
  };

  const excluirLista = async () => {
    const atualizadas = listas.filter((lista) => lista !== editarLista);
    setListas(atualizadas);
    await salvarListas(atualizadas);
    setEditarLista(null);
    setModalVisible(false);
  };

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>Gerencie Suas Listas</Text>
      <FlatList
  data={listas}
  keyExtractor={(item, index) => index.toString()}
  renderItem={({ item }) => (
    <View style={styles.listItem}>
      {/* Botão da lista */}
      <TouchableOpacity
        style={styles.listButton}
        onPress={() => navigation.navigate('Lista', { lista: item })}
      >
        <Text style={styles.listText} numberOfLines={1}>
          {item.nome}
        </Text>
      </TouchableOpacity>

      {/* Botão de edição */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          setEditarLista(item);
          setNovoNome(item.nome);
          setModalVisible(true);
        }}
      >
        <Text style={styles.editButtonText}>✏️</Text>
      </TouchableOpacity>

      {/* Botão para compartilhar */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => compartilharLista(item)}
      >
        <Text style={styles.shareButtonText}>📤</Text>
      </TouchableOpacity>
    </View>
  )}
/>



      <TouchableOpacity
  style={[styles.fab, { bottom: 130 }]} // Aumentando o valor de bottom
  onPress={() => navigation.navigate('Histórico')}
>
  <Text style={styles.fabText}>📜</Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.fab}
  onPress={() => setModalVisible(true)}
>
  <Text style={styles.fabText}>+</Text>
</TouchableOpacity>


      {/* Modal para criar ou editar lista */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editarLista ? 'Editar Lista' : 'Criar Nova Lista'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da lista"
              value={novoNome}
              onChangeText={setNovoNome}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={editarLista ? salvarAlteracoesLista : criarNovaLista}
            >
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
            {editarLista && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#ff4d4d' }]}
                onPress={excluirLista}
              >
                <Text style={styles.buttonText}>Excluir Lista</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#888' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function ListaScreen({ route }) {
  const { lista } = route.params;
  const [itens, setItens] = useState(lista.itens || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoItem, setNovoItem] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('0');
  const [editarItem, setEditarItem] = useState(null);

  // Função para verificar a validade do item
 const verificarValidade = (validade) => {
  const hoje = new Date();
  const validadeDate = new Date(validade.split('/').reverse().join('-'));

  // Ajusta a comparação para não marcar o item como vencido até o final do dia de vencimento
  validadeDate.setHours(23, 59, 59, 999); // Definindo o horário de vencimento para o final do dia

  const diasRestantes = Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return 'Vencido';
  } else if (diasRestantes === 0) {
    return 'Vencido';
  } else if (diasRestantes <= 3) {
    return `Faltam ${diasRestantes} dias`;
  } else {
    return `Validade em ${diasRestantes} dias`;
  }
};


  // Função para salvar os itens da lista no armazenamento
  const salvarItensNaLista = async (novosItens) => {
    const listas = await carregarListas();
    const listaAtualizada = listas.map((l) =>
      l.nome === lista.nome ? { ...l, itens: novosItens } : l
    );
    await salvarListas(listaAtualizada);
  };

  // Função para agendar notificações para todos os itens
  const agendarNotificacoesEmMassa = async () => {
    for (const item of itens) {
      if (verificarValidade(item.validade) !== 'Vencido' && !item.comprado) {
        await agendarNotificacaoIndividual(item);
      }
    }
  };

  // Função para agendar uma notificação individual
  const agendarNotificacaoIndividual = async (item) => {
    const validadeStatus = verificarValidade(item.validade);
    if (validadeStatus !== 'Vencido' && !item.comprado) {
      await agendarNotificacao(item);
    }
  };

  // Função para adicionar um item na lista
  const adicionarItem = async () => {
    if (!novoItem.trim()) {
      Alert.alert('Erro', 'Insira um nome para o item.');
      return;
    }

    if (!validarData(dataValidade)) {
      Alert.alert('Erro', 'Insira uma data válida no formato dd/mm/yyyy.');
      return;
    }

    const precoConvertido = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoConvertido)) {
      Alert.alert('Erro', 'Insira um preço válido para o item.');
      return;
    }

    const novoItemObj = {
      nome: novoItem,
      validade: dataValidade || 'Sem validade',
      quantidade: parseFloat(quantidade) || 1,
      preco: precoConvertido,
      comprado: false,
    };

    const atualizado = [...itens, novoItemObj];
    setItens(atualizado);
    salvarItensNaLista(atualizado);
    await agendarNotificacaoIndividual(novoItemObj);

    setNovoItem('');
    setDataValidade('');
    setQuantidade('1');
    setPreco('0');
    setModalVisible(false);
  };

  // Função para editar um item da lista
  const editarItemFuncao = async () => {
    const atualizado = [...itens];
    const index = itens.indexOf(editarItem);
    atualizado[index] = {
      ...editarItem,
      nome: novoItem,
      validade: dataValidade,
      quantidade: parseFloat(quantidade) || 1,
      preco: parseFloat(preco.replace(',', '.')) || 0,
    };

    setItens(atualizado);
    salvarItensNaLista(atualizado);
    await agendarNotificacaoIndividual(atualizado[index]);

    setEditarItem(null);
    setModalVisible(false);
  };

  // Função para excluir um item da lista
  const excluirItem = async () => {
    const atualizado = itens.filter((item) => item !== editarItem);
    setItens(atualizado);
    salvarItensNaLista(atualizado);
    setEditarItem(null);
    setModalVisible(false);
  };

  // Função para marcar item como comprado
  const marcarComoComprado = (item) => {
    const atualizado = itens.map((i) =>
      i === item ? { ...i, comprado: !i.comprado } : i
    );
    setItens(atualizado);
    salvarItensNaLista(atualizado);
  };

  // Função para calcular o valor total da lista
  const calcularValorTotal = () => {
    return itens.reduce((total, item) => {
      if (item.preco && item.quantidade) {
        total += item.quantidade * item.preco;
      }
      return total;
    }, 0);
  };

  // Função para formatar o preço
  const formatarPreco = (valor) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  };

  // Função para formatar a data de validade
  const formatarData = (data) => {
    return data.replace(/\D/g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
  };

  // Agendar notificações ao carregar a lista
  useEffect(() => {
    agendarNotificacoesEmMassa();
  }, []);

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>{lista.nome}</Text>
      <FlatList
        data={itens}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const validadeStatus = verificarValidade(item.validade);

          return (
            <View style={[styles.itemRow, validadeStatus === 'Vencido' && styles.itemVencido]}>
              <View style={styles.checkboxContainer}>
                <CheckBox
                  value={item.comprado}
                  onValueChange={() => marcarComoComprado(item)}
                />
              </View>
              <View style={styles.itemInfoContainer}>
                <Text
                  style={[styles.itemNome, item.comprado && styles.itemComprado, validadeStatus === 'Vencido' && styles.itemVencidoTexto]}>
                  {item.nome} ({item.quantidade}) - {item.validade}
                </Text>
                <Text style={styles.itemDetalhes}>
                  Status: {validadeStatus} - Preço Total: R$ {formatarPreco(item.quantidade * item.preco)}
                </Text>
                {validadeStatus === 'Vencido' && (
                  <Text style={styles.vencidoMensagem}>Este item está vencido!</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: 'transparent' }]}
                onPress={() => {
                  setEditarItem(item);
                  setNovoItem(item.nome);
                  setDataValidade(item.validade || '');
                  setQuantidade(item.quantidade?.toString() || '');
                  setPreco(item.preco?.toString().replace('.', ',') || '0');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          Valor Total da Lista: R$ {formatarPreco(calcularValorTotal())}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.fab, { bottom: 60 }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editarItem ? 'Editar Item' : 'Adicionar Item'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do item"
              value={novoItem}
              onChangeText={setNovoItem}
            />
            <TextInput
              style={styles.input}
              placeholder="Data de validade (dd/mm/yyyy)"
              value={dataValidade}
              onChangeText={(texto) => setDataValidade(formatarData(texto))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Quantidade"
              value={quantidade}
              onChangeText={(texto) => setQuantidade(texto)}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Preço unitário (ex: 5,25)"
              value={preco}
              onChangeText={setPreco}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={editarItem ? editarItemFuncao : adicionarItem}
            >
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
            {editarItem && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#ff4d4d' }]}
                onPress={excluirItem}
              >
                <Text style={styles.buttonText}>Excluir</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ccc' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// Tela Histórico
function HistoricoScreen() {
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    const carregarDados = async () => {
      const historicoCarregado = await carregarHistorico();
      setHistorico(historicoCarregado);
    };
    carregarDados();
  }, []);

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>Histórico de Compras</Text>
      <FlatList
        data={historico}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>
              {item.nome} ({item.quantidade}) - {item.validade}
            </Text>
          </View>
        )}
      />
    </LinearGradient>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Inicio"
        screenOptions={{
          headerStyle: { backgroundColor: '#ADD8E6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Inicio" component={InicioScreen} />
        <Stack.Screen name="Gerenciar Listas" component={GerenciarListasScreen} />
        <Stack.Screen name="Lista" component={ListaScreen} />
        <Stack.Screen name="Histórico" component={HistoricoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 25,
    marginTop: 20,
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
  },
  listButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  listText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  listContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  editButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  shareButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  itemInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 5,
  },
  itemStatusText: {
    fontSize: 14,
    color: 'gray',
  },
  itemPriceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemComprado: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  itemVencidoTexto: {
    color: 'red',
    fontWeight: 'bold',
  },
  vencidoMensagem: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 5,
  },
  editButtonContainer: {
    marginLeft: 10,
  },
  statusAndPriceContainer: {
    width: '100%',
    paddingLeft: 30,
    marginTop: 5,
  },
  statusAndPriceText: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  totalContainer: {
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    marginTop: 20,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 20,
  },
  icon: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
});
