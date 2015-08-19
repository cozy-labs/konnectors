module.exports =

    'bad credentials' : 'Mauvais identifiants'
    'no bills retrieved': 'Pas de factures trouvées'
    'key not found': 'Clé non trouvée'
    'last import:': 'Dernière importation :'
    'save and import': 'Sauvegarder et importer'
    'auto import': 'Importation automatique'
    'imported data:': 'Données importées :'
    'importing...': 'importation en cours...'
    'no import performed': "Pas d'importation effectuée"
    'import already running': "L'import est déjà en cours."
    'firstname': 'Prénom'
    'lastname': 'Nom'
    'login': 'Identifiant'
    'password': 'Mot de passe'
    'email': 'Mail'
    'accessToken': 'Access token'
    'accessTokenSecret': 'Access token secret'
    'consumerKey': 'Consumer Key'
    'consumerSecret': 'Consumer Secret'
    'apikey': 'Api key'
    'phoneNumber': 'Numéro de téléphone'
    'folderPath': 'Chemin du dossier'
    'none' : 'Aucun'
    'every hour': 'Toutes les heures'
    'every day': 'Tous les jours'
    'every week': 'Toutes les semaines'
    'each month': 'Tous les mois'

    'date format': 'DD/MM/YYYY [à] HH[h]mm'

    'home headline': """
    Konnectors vous permet de récupérer de nombreuses données et de les intégrer à votre Cozy.
    De vos factures de téléphone aux données de votre balance connectée en passant par vos tweets. Configurez les connecteurs qui vous intéressent :
    """
    'home config step 1': "Sélectionnez un connecteur dans le menu à gauche"
    'home config step 2': "Suivez les instructions pour le configurer"
    'home config step 3': "Vos données sont récupérées et intégrer à votre Cozy"

    'home more info': "Quelques informations supplémentaires :"
    'home help step 1': "Vous devez manuellement déclencher l'importation sauf si vous avez activé l'importation automatique"

    'notification import error': "une erreur est survenue pendant l'importation des données"

    'error occurred during import.': 'Une erreur est survenue lors de la dernière importation.'
    'error occurred during import:': 'Une erreur est survenue lors de la dernière importation :'
    "import server error": "L'import a rencontré une erreur serveur."

    # Konnectors' description
    'konnector description free': "Téléchargez toutes vos factures internet de Free. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description free mobile': "Téléchargez toutes vos factures Free Mobile. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description bouygues': "Téléchargez toutes vos factures téléphones de Bouygues Telecom. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description bouygues box': "Téléchargez toutes vos factures internet de Bouygues Telecom. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description github': "Téléchargez toutes vos factures Github. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description github commits': "Sauvegardez les informations de tous vos commits Github."
    'konnector description jawbone': "Téléchargez les données de déplacement et de sommeil depuis un fichier CSV Jawbone."
    'konnector description rescuetime': "Téléchargez toutes vos activités RescueTime."
    'konnector description withings': "Téléchargez toutes les mesures de vos appareils Withings."
    'konnector description twitter': """
    Téléchargez tous vos tweets publiés sur Twitter. Ce connecteur requiert
    deux identifiants and deux clés secrètes. Vous pouvez les générer via le
    <a href="https://apps.twitter.com/">tableau Twitter de gestion
    d'applications</a>. Vous pourrez y créez une application. Twitter vous
    fournira des identifiants pour cette application. Avec ces identifiants
    ce connecteur pourra récupérer vos données.
    """
    'konnector description digital ocean': "Téléchargez toutes vos factures Digital Ocean. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description sosh': "Téléchargez toutes vos factures Sosh. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description electrabel': "Téléchargez toutes vos factures Electrabel. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description orange': "Téléchargez toutes vos factures Orange. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description numericable': "Téléchargez toutes vos factures Numéricable. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description virgimobile': "Téléchargez toutes vos factures Virgin Mobile. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy."
    'konnector description nest': "Enregistrez la température actuelle mesurée par votre Nest."
    'konnector description isen': "Les étudiants de l'école d'ingénieur ISEN peuvent importer leurs supports de cours et leur agenda."

    # Konnectors' notifications
    'notification prefix': "Konnector %{name} :"
    'notification github commits': "%{smart_count} nouveau commit importé |||| %{smart_count} nouveaux commits importés"
    'notification twitter': "%{smart_count} nouveau tweet importé |||| %{smart_count} nouveaux tweets importés"
    'notification free': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification github': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification jawbone': "%{smart_count} nouvelle mesure importée |||| %{smart_count} nouvelles mesures importées"
    'notification rescuetime': "%{smart_count} nouvelle activité importée |||| %{smart_count} nouvelles activités importées"
    'notification withings': "%{smart_count} nouvelle mesure importée |||| %{smart_count} nouvelles mesures importées"
    'notification free mobile': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification digital ocean': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification sosh': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification electrabel': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification numericable': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"
    'notification virginmobile': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées"

    "konnector danger zone": "Zone dangereuse"
    "konnector delete credentials": "Supprimer cette configuration."
    "konnector deleted": "La configuration de ce connecteur a bien été supprimée."
    "konnector deletion error": "Une erreur est survenue lors de la suppression de la configuration de ce connecteur."

    'notification isen': "%{smart_count} nouveau support de cours importé |||| %{smart_count} nouveaux supports de cours importés"
    'notification isen event changed': "Attention, l'intervention %{description} se déroulera le %{newDate} au lieu du %{oldDate}"
    'notification isen date format': "DD/MM [à] HH:mm"
    'notification isen event deleted': "Attention, l'intervention %{description} devant se dérouler le %{date} a été annulée"
