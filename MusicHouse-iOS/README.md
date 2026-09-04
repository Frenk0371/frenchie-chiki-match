# Music House iOS

Prototipo iOS nativo di Music House.

## Obiettivo
- caricare l'attuale Music House dentro un contenitore iOS nativo
- abilitare una sessione audio `.playback`
- dichiarare il background mode `audio`
- mantenere AirPlay disponibile
- produrre una build `.ipa` non firmata, adatta a essere firmata e installata con strumenti di sideloading come AltStore/SideStore

## Nota importante sul playback YouTube
Il progetto non estrae audio da YouTube e non aggira le limitazioni del player. Il comportamento effettivo del player YouTube quando l'iPhone viene bloccato deve essere verificato su un iPhone reale. La sessione audio nativa e il background mode sono predisposti, ma non garantiscono da soli che l'IFrame YouTube continui la riproduzione a schermo spento.

## Build locale
Richiede macOS, Xcode e XcodeGen.

```bash
brew install xcodegen
cd MusicHouse-iOS
xcodegen generate
xcodebuild -project MusicHouse.xcodeproj -scheme MusicHouse -configuration Release -sdk iphoneos -derivedDataPath build CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""
mkdir -p Payload
cp -R build/Build/Products/Release-iphoneos/MusicHouse.app Payload/
zip -qry MusicHouse.ipa Payload
```

La firma per l'installazione sul dispositivo viene applicata successivamente dal metodo di sideloading scelto.
