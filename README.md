# Robô Olhinhos

PWA leve, sem frameworks, com olhos animados para usar como o rosto de um robô físico. O aplicativo foi pensado primeiro para iPhone em modo horizontal e funciona também em navegadores modernos no desktop e Android.

## Uso local

Abra `index.html` em um servidor estático (o reconhecimento de voz normalmente exige HTTPS ou `localhost`). Por exemplo:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080/`.

Use **Conversar** para solicitar microfone, transcrever fala em português brasileiro e ouvir a resposta. Sem endpoint configurado, o app usa respostas locais de demonstração.

## Endpoint seguro de IA

Em Configurações, informe o endereço do seu backend. O navegador envia:

```json
{ "message": "texto falado", "robotName": "Olhinhos", "kids": true }
```

O backend deve responder `{"reply":"..."}`. Este frontend nunca contém chave de API: o endpoint deve guardar credenciais e conversar com o provedor de IA no servidor.

## Publicação no GitHub Pages

O workflow em `.github/workflows/pages.yml` publica automaticamente a raiz do repositório a cada push em `main`. A URL esperada é:

https://brennoaraujo16-coder.github.io/robo-olhinhos/

Em **Settings → Pages**, selecione **GitHub Actions** caso o Pages ainda não esteja habilitado. Reconhecimento de voz e chamadas a um endpoint precisam de HTTPS e políticas CORS adequadas. O Safari no iPhone pode ser adicionado à Tela de Início pelo menu Compartilhar.
