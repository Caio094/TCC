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
} from 'react-native';
import CheckBox from 'expo-checkbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

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

// Função para formatar data
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

// Tela Inicial
function InicioScreen({ navigation }) {
  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao App de Compras</Text>
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

  useEffect(() => {
    const atualizarListas = async () => {
      const listasCarregadas = await carregarListas();
      setListas(listasCarregadas);
    };
    atualizarListas();
  }, []);

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>Gerencie Suas Listas</Text>
      <FlatList
        data={listas}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listButton}
            onPress={() => navigation.navigate('Lista', { lista: item })}
          >
            <Text style={styles.listText} numberOfLines={1}>
              {item.nome}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Nova Lista')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// Tela Nova Lista
function NovaListaScreen({ navigation }) {
  const [nomeLista, setNomeLista] = useState('');

  const criarNovaLista = async () => {
    if (!nomeLista.trim()) {
      Alert.alert('Erro', 'Insira um nome para a lista.');
      return;
    }

    const listas = await carregarListas();
    const novasListas = [...listas, { nome: nomeLista, itens: [] }];
    await salvarListas(novasListas);
    setNomeLista('');
    navigation.navigate('Gerenciar Listas');
  };

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <Text style={styles.title}>Criar Nova Lista</Text>
      <TextInput
        style={[styles.input, { width: '90%' }]}
        placeholder="Nome da lista"
        value={nomeLista}
        onChangeText={setNomeLista}
        numberOfLines={1}
      />
      <TouchableOpacity style={styles.button} onPress={criarNovaLista}>
        <Text style={styles.buttonText}>Salvar</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// Tela Lista
function ListaScreen({ route, navigation }) {
  const { lista } = route.params;
  const [itens, setItens] = useState(lista.itens || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editarModalVisible, setEditarModalVisible] = useState(false);
  const [novoItem, setNovoItem] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [editarItem, setEditarItem] = useState(null);

  useEffect(() => {
    const atualizarItens = async () => {
      const listas = await carregarListas();
      const listaAtualizada = listas.find((l) => l.nome === lista.nome);
      if (listaAtualizada) setItens(listaAtualizada.itens);
    };
    atualizarItens();
  }, []);

  const salvarItensNaLista = async (novosItens) => {
    const listas = await carregarListas();
    const listaAtualizada = listas.map((l) =>
      l.nome === lista.nome ? { ...l, itens: novosItens } : l
    );
    await salvarListas(listaAtualizada);
  };

  const adicionarItem = async () => {
    if (!novoItem.trim()) {
      Alert.alert('Erro', 'Insira um nome para o item.');
      return;
    }

    const atualizado = [
      ...itens,
      { nome: novoItem, validade: dataValidade, quantidade, comprado: false },
    ];
    setItens(atualizado);
    salvarItensNaLista(atualizado);
    setNovoItem('');
    setDataValidade('');
    setQuantidade(1);
    setModalVisible(false);
  };

  const editarItemFuncao = async () => {
    const atualizado = [...itens];
    const index = itens.indexOf(editarItem);
    atualizado[index] = {
      ...editarItem,
      nome: novoItem,
      validade: dataValidade,
      quantidade,
    };
    setItens(atualizado);
    salvarItensNaLista(atualizado);
    setEditarModalVisible(false);
  };

  const excluirItem = async () => {
    const atualizado = itens.filter((item) => item !== editarItem);
    setItens(atualizado);
    salvarItensNaLista(atualizado);
    setEditarModalVisible(false);
  };

  const excluirLista = async () => {
    Alert.alert(
      'Excluir Lista',
      `Tem certeza que deseja excluir a lista "${lista.nome}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const listas = await carregarListas();
            const novasListas = listas.filter((l) => l.nome !== lista.nome);
            await salvarListas(novasListas);
            navigation.navigate('Gerenciar Listas');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#ADD8E6', '#FFFFFF']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{lista.nome}</Text>
        <TouchableOpacity onPress={excluirLista}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={itens}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.leftContent}>
              <CheckBox
                value={item.comprado}
                onValueChange={() => {
                  const atualizado = [...itens];
                  const index = itens.indexOf(item);
                  atualizado[index].comprado = !item.comprado;
                  setItens(atualizado);
                  salvarItensNaLista(atualizado);
                }}
              />
              <Text
                style={[styles.item, item.comprado && styles.itemComprado]}
                numberOfLines={1}
              >
                {item.nome} ({item.quantidade}) - {item.validade}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setEditarItem(item);
                setNovoItem(item.nome);
                setDataValidade(item.validade);
                setQuantidade(item.quantidade);
                setEditarModalVisible(true);
              }}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal para adicionar item */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
              value={quantidade.toString()}
              onChangeText={(texto) => setQuantidade(parseInt(texto) || 1)}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={adicionarItem}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ff4d4d' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para editar item */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editarModalVisible}
        onRequestClose={() => setEditarModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
              value={quantidade.toString()}
              onChangeText={(texto) => setQuantidade(parseInt(texto) || 1)}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={editarItemFuncao}>
              <Text style={styles.buttonText}>Salvar Alterações</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ff4d4d' }]}
              onPress={excluirItem}
            >
              <Text style={styles.buttonText}>Excluir Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#888' }]}
              onPress={() => setEditarModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// App Principal
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Inicio"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ADD8E6',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Inicio" component={InicioScreen} />
        <Stack.Screen
          name="Gerenciar Listas"
          component={GerenciarListasScreen}
        />
        <Stack.Screen name="Nova Lista" component={NovaListaScreen} />
        <Stack.Screen name="Lista" component={ListaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
  },
  listButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    justifyContent: 'flex-start',
  },
  listText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#ff4d4d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '95%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    width: '90%',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    fontSize: 16,
    marginLeft: 10,
  },
  itemComprado: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  editButton: {
    paddingHorizontal: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
});
