xml2js = require 'xml2js'
request = require 'request'
async = require 'async'
moment = require 'moment'
cozydb = require 'cozydb'

updateOrCreate = require '../lib/update_or_create'
File = require '../models/file'

parser = new xml2js.Parser()
builder = new xml2js.Builder headless: true

logger = require('printit') {
    prefix: 'EDF'
    date: true
}

# TODO :
# multi account
# multi contract

# Models
Client = cozydb.getModel 'Client',
    clientId: String # Client Id in EDF.
    vendor: String # EDF
    numeroAcc: String # Another client Id from EDF.
    address: Object # Client postal address
    name: Object # CLiet name
    email: String # client Email
    cellPhone: String # Client cell phone number
    homePhone: String # Client home phone number
    loginEmail: String # Client email used as login
    coHolder: Object # Name of the co-holder of the contract
    commercialContact: Object # Commercial contact information.
    docTypeVersion: String

Contract = cozydb.getModel 'Contract',
    clientId: String # Client Id in EDF
    vendor: String # EDF
    number: String # Contract number
    name: String # Name of the commercial offer
    start: String # Start date of the contract
    end: String # End date of the contract (if contract ended.)
    status: String # Current state of the contract
    terminationGrounds: String # if the contract is ended
    services: [Object] # Additionnal services with the contract.

    pdl: String # "Point de livraison" : id of the electric counter
    energie: String # Type of energy
    troubleshootingPhone: String # Phone number to get help from edf.
    power: String # Power contracted.
    contractSubcategory1: String # Sub category of the contract
    contractSubcategory2: String # Sub category of the contract
    counter: Object # Data about energy counter.
    annualConsumption: Number # The previous annual energy consumption.
    peakHours: String # For some offers, time of rpice shift.
    statement: Object # Details about counter reading.
    docTypeVersion: String

PaymentTerms = cozydb.getModel 'PaymentTerms',
    vendor: String # EDF
    clientId: String # Client Id in EDF
    bankDetails: Object #  IBAN, ...
    balance: Number # Amount due to EDF.
    paymentMeans: String # Way of paiement.
    lastPayment: Object # Last payment occured.
    billFrequency: String # Duration between each bills.
    nextBillDate: String # Date of the next bill.
    paymentSchedules: [Object] # Accounts payment agenda.
    modifBankDetailsAllowed: Boolean # Is client allowed to change the
                                     # bankdetails.
    idPayer: String # Client Id of the client which pay the bills.
    payerDivergent: Boolean # True if clientId isent idPayer.
    docTypeVersion: String

Home = cozydb.getModel 'Home',
    pdl: String # "Point de livraison" : id of the electric counter
    beginTs: String # Creation of the profil.
    isProfileValidated: Boolean # If the user as re-read and validated this.
    housingType: String # Flat, house, ...
    residenceType: String # first, secondary ...
    occupationType: String # Rent, owned
    constructionDate: String # Date of construction of the building.
    isBBC: Boolean # Low consumption building.
    surface: Number # Living surface.
    occupantsCount: Number # How much people leaves in.
    principalHeatingSystemType: String # What kind of heating system.
    sanitoryHotWaterType: String # What king of water heating system.
    docTypeVersion: String

ConsumptionStatement = cozydb.getModel 'ConsumptionStatement',
    contractNumber: String # Contract linked to this consumption
    billNumber: String # bill linked to this consumption.
    start: String # start date of the statement period.
    end: String # end date of the statement period.
    value: Number # Consumption value.
    statementType: String # Readed, estimated, ...
    statementCategory: String # Statemet subcategory
    statementReason: String # Statemet subcategory
    period: String # Simple designation of the temporal period of statement.
    cost: Number # Cost
    costsByCategory: Object # Details on costs
    valuesByCatergory: Object # Details on values
    similarHomes: Object # Similar home consumption comparisons.
    statements: [Object] # List of statement occured in this period.
    docTypeVersion: String

Bill = require '../models/bill'


# Requests

getEDFToken = (requiredFields, entries, data, callback) ->
    K.logger.info 'getEDFToken'
    path = "/ws/authentifierUnClientParticulier_rest_V2-0/invoke"
    body =
        "ns:msgRequete":
            "$":
                "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance"
                "xsi:schemaLocation": "http://www.edf.fr/commerce/" +
                "passerelle/authentifierUnClientParticulier/service/v2/" +
                "message authentifierUnClientParticulier.xsd"
                "xmlns:ns": "http://www.edf.fr/commerce/passerelle/" +
                "authentifierUnClientParticulier/service/v2/message"

            "ns:enteteEntree": [
                "ns:idCanal": 5
            ]
            "ns:corpsEntree": [
                "ns:idAppelant": requiredFields.email
                "ns:password": requiredFields.password
            ]

    edfRequestPost path, body, (err, result) ->
        return callback err if err

        token = getF result['ns:msgReponse'], 'ns:corpsSortie', 'ns:jeton'

        if token?
            K.logger.info "EDF token fetched"
            data.edfToken = token
            callback()
        else
            K.logger.error "Can't fetch EDF token"
            callback new Error "Can't fetch token"

fetchListerContratClientParticulier = (reqFields, entries, data, callback) ->
    K.logger.info "fetch listerContratClientParticulier"

    path = '/ws/listerContratClientParticulier_rest_V4-0/invoke'
    body =
        'msgRequete':
            '$':
                'xmlns': "http://www.edf.fr/commerce/passerelle/pas072/" +
                "listerContratClientParticulier/service/v3"
                'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance"
                'xsi:schemaLocation': "http://www.edf.fr/commerce/passerelle/" +
                "pas072/listerContratClientParticulier/service/" +
                "v3 listerContratClientParticulier.xsd"

            'EnteteEntree':
                'Jeton': data.edfToken

    edfRequestPost path, body, (err, result) ->
        return callback err if err
        try
            client =
                vendor: 'EDF'
                docTypeVersion: K.docTypeVersion

            resBody = getF result["tns:msgReponse"], \
                      "tns:CorpsSortie", 'tns:AccordCo'

            # numeroAcc and numeroBD are mandatory.
            client.numeroAcc = getF resBody, 'tns:Numero'

            bpObject = getF resBody, 'tns:BP'
            client.clientId = getF bpObject, 'tns:Numero'


            # Put address in cozy-contact like format, two lines :
            # First: Postbox, appartment and street adress on first
            # Second: Locality, region, postcode, country
            addressObject = getF resBody, 'tns:Adresse'
            if addressObject
                numRue = getF(addressObject, 'tns:NumRue') or ""
                nomRue = getF(addressObject, 'tns:NomRue') or ""
                codePostal = getF(addressObject, 'tns:CodePostal') or ""
                ville = getF(addressObject, 'tns:Ville') or ""

                client.address =
                    street: "#{numRue} #{nomRue}"
                    city: ville
                    postcode: codePostal
                    country: 'FRANCE'
                    formated: "#{numRue} #{nomRue}\n#{codePostal} #{ville}"

            # name in cozy-contact like format !
            identiteObj = getF bpObject, 'tns:Identite'
            civilite = getF(identiteObj, 'tns:Civilite') or ''
            nom = getF(identiteObj, 'tns:Nom') or ''
            prenom = getF(identiteObj, 'tns:Prenom') or ''
            client.name =
                prefix: civilite
                family: nom
                given: prenom
                formated: "#{prenom} #{nom}"


            coTitulaireElem = getF bpObject, 'tns:IdentitePart'
            if coTitulaireElem
                coHolder =
                    family: getF coTitulaireElem, 'tns:NomCoTitulaire'
                    given: getF coTitulaireElem, 'tns:PrenomCoTitulaire'

                coHolder.formated = "#{coHolder.given} #{coHolder.family}"
                client.coHolder = coHolder

            client.email = getF bpObject, 'tns:Coordonnees', 'tns:Email'
            client.cellPhone = getF bpObject, 'tns:Coordonnees'
                                        , 'tns:NumTelMobile'

            # Contracts
            contratElems = resBody['tns:Contrat']

            contracts = contratElems.map (contratElem) ->
                contract =
                    vendor: 'EDF'
                    clientId: client.clientId
                    docTypeVersion: K.docTypeVersion

                contract.number = getF contratElem, 'tns:Numero'
                contract.pdl = getF contratElem, 'tns:NumeroPDL'
                vieContratObj = getF contratElem, 'tns:VieDuContrat'
                contract.start = getF vieContratObj, 'tns:DateDebut'
                contract.status = getF vieContratObj, 'tns:Statut'

                contract.end = getF vieContratObj, 'tns:DateFin'
                contract.terminationGrounds = getF vieContratObj
                , 'tns:MotifResiliation'

                offreSouscriteObj = getF contratElem, 'tns:OffreSouscrite'

                contract.energie = translate
                    ELECTRICITE: 'Électricité'
                    GAZ: 'Gaz'
                , getF(offreSouscriteObj, 'tns:Energie')

                contract.name = translate
                    GN_2: 'Offre Gaz naturel'
                    MCGN_2: 'Mon Contrat gaz naturel'
                    MCGN_PRIX_FIXE_1: 'Mon Contrat Gaz Naturel a prix fixe'
                    ELECTRICITE_PRO: 'Electricite Pro'
                    ELEC_DEREGULE: 'Mon Contrat Electricite'
                    ELEC_PRO_PX_FIXE_1: 'Electricite Pro a Prix Fixe'
                    ESSENTIEL_PRO: 'Essentiel Pro'
                    OFFRE_HC_SOUPLES: 'Heures Creuses Souples'
                    PRESENCE_PRO: 'Presence Pro'
                    SOUPLESSE_PRO: 'Souplesse Pro'
                    TARIF_BLEU: 'Tarif Bleu'
                    TARIF_BLEU_PART: 'Tarif Bleu'
                    ESSENTIEL_GAZ: 'Essentiel Gaz'
                    GAZ: 'Mon Contrat Gaz Naturel'
                    GAZ_2: 'Mon Contrat Gaz Naturel'
                    GAZ_NAT_PX_FIXE_1: 'Gaz Naturel a Prix Fixe'
                    PRESENCE_GAZ: 'Presence Gaz'
                    SOUPLESSE_GAZ: 'Souplesse Gaz'
                    TARIF_BLEU_GAZ: 'Gaz Naturel'
                    TARIF_EJP_PART: 'EJP'
                    OFFRE_TPN: 'TPN'
                , getF(offreSouscriteObj, 'tns:NomOffre')

                contract.troubleshootingPhone = getF offreSouscriteObj
                , 'tns:NumeroDepannageContrat'

                switch contract.energie
                    when 'Électricité'
                        contract.power = translate
                            PUI00: '0 kVA'
                            PUI03: '3 kVA'
                            PUI06: '6 kVA'
                            PUI09: '9 kVA'
                            PUI12: '12 kVA'
                            PUI15: '15 kVA'
                            PUI18: '18 kVA'
                            PUI24: '24 kVA'
                            PUI30: '30 kVA'
                            PUI36: '36 kVA'
                        , getF(offreSouscriteObj, 'tns:Puissance')
                        contract.contractSubcategory1 = getF offreSouscriteObj
                        , 'tns:StructureTarifaire'

                    when 'Gaz'
                        contract.contractSubcategory2 = getF offreSouscriteObj
                                                    , 'tns:OptionPrix'

                cadranElem = getF contratElem, 'tns:ListeCadran'
                if cadranElem
                    counter = {}
                    counter.comptage = getF cadranElem, 'tns:Type'
                    counter.nombreRoues = getF cadranElem, 'tns:NombreRoues'
                    counter.dernierIndex = getF cadranElem, 'tns:DernierIndex'

                    counter.type = getF contratElem, 'tns:DonneesTechniques'
                                            , 'tns:TypeCompteur'

                    contract.counter = counter

                    contract.annualConsumption = getF cadranElem
                    , 'tns:ConsommationAnnuelle'

                contract.peakHours = getF contratElem
                , 'tns:DonneesTechniques', 'tns:HorrairesHC'

                releveElem = getF contratElem, 'tns:Releve'

                if releveElem
                    statement = {}
                    statement.prochaineReleve = getF releveElem
                    , 'tns:ProchaineDateReleveReelle'
                    statement.saisieReleveConfiance = getF releveElem
                        , 'tns:SaisieRC'
                    statement.dateFermetureReleveConfiance = getF releveElem
                    , 'tns:DateFermetureRC'
                    statement.prochaineDateOuvertureReleveConfiance = getF(
                        releveElem, 'tns:ProchaineDateOuvertureRC')
                    statement.prochaineDateFermetureReleveConfiance = getF(
                        releveElem, 'tns:ProchaineDateFermetureRC')
                    statement.prochaineDateFermetureReelle = getF releveElem
                    , 'tns:ProchaineDateFermetureReelle'
                    statement.saisieSuiviConso = getF releveElem, 'tns:SaisieSC'
                    statement.prochaineDateOuvertureSaisieConso = getF(
                        releveElem, 'tns:ProchaineDateOuvertureSC')

                    contract.statement = statement

                contract.services = []
                if contratElem['tns:ServicesSouscrits']
                    services = contratElem['tns:ServicesSouscrits']
                    .map (serviceElem) ->
                        service =
                            nom: getF serviceElem, 'tns:NomService'
                            activ: getF serviceElem, 'tns:Etat'
                        return service
                    contract.services = contract.services.concat services

                if resBody['tns:ServicesSouscrits']

                    services = resBody['tns:ServicesSouscrits']
                    .map (serviceElem) ->
                        service =
                            nom: getF serviceElem, 'tns:nomService'
                            # TODO : to UTC
                            start: getF serviceElem, 'tns:dateSouscription'
                            activ: getF serviceElem, 'tns:statut'
                        return service

                    contract.services = contract.services.concat services

                return contract

            K.logger.info "Fetched listerContratClientParticulier"
            entries.client.push client
            entries.contract = contracts

            callback()

        catch e
            K.logger.error "While fetching listerContratClientParticulier", e
            return callback e


fetchVisualiserPartenaire = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchVisualiserPartenaire"

    path = '/ws/visualiserPartenaire_rest_V2-0/invoke'
    body =
        'msgRequete':
            '$':
                'xsi:schemaLocation': "http://www.edf.fr/commerce/passerelle/" +
                "css/visualiserPartenaire/service/v2 C:\\HMN\\EDFMoiV2\\WSDL" +
                "\\passerelle\\passerelle\\css\\visualiserPartenaire\\service" +
                "\\v2\\visualiserPartenaire.xsd"
                'xmlns': "http://www.edf.fr/commerce/passerelle/css/" +
                "visualiserPartenaire/service/v2"
                'xmlns:ent': "http://www.edf.fr/commerce/passerelle/commun/" +
                "v2/entete"
                'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance"

            'enteteEntree':
                'ent:jeton': data.edfToken

            'corpsEntree':
                'numeroBp': entries.client[0].clientId

    edfRequestPost path, body, (err, result) ->
        return callback err if err
        try
            partenaireElem = getF result["ns:msgReponse"], \
                        "ns:corpsSortie", "ns:partenaire"
            client = {}
            coordonneesElem = getF partenaireElem, 'ns:coordonnees'
            client.cellPhone = getF coordonneesElem, 'ns:NumTelMobile'
            client.homePhone = getF coordonneesElem, 'ns:NumTelFixe'
            client.email = getF coordonneesElem, 'ns:Email'
            client.loginEmail = getF coordonneesElem, 'ns:EmailAEL'

            contactElem = getF partenaireElem, 'ns:centreContact'
            contact = {}
            contact.title = getF contactElem, 'ns:gsr'
            contact.phone = getF contactElem, 'ns:telephone'

            adresseElem = getF contactElem, 'ns:adresse'
            if adresseElem
                address = {}
                address.street = getF adresseElem, 'ns:nomRue'
                address.postcode = getF adresseElem, 'ns:codePostal'
                address.city = getF adresseElem, 'ns:ville'
                address.formated = "#{address.street}" +
                    "\n#{address.postcode} #{address.city}"
                contact.address = address

            client.commercialContact = contact

            entries.client[0] = _extend entries.client[0], client

            K.logger.info "Fetched visualiserPartenaire."
            callback()

        catch e
            K.logger.error "While fetching visualiserPartenaire."
            K.logger.error e
            return callback e


fetchVisualiserAccordCommercial = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchVisualiserAccordCommercial"

    path = '/ws/visualiserAccordCommercial_rest_V2-0/invoke'
    body =
        'msg:msgRequete':
            '$':
                'xmlns:dico': "http://www.edf.fr/commerce/passerelle/commun/" +
                "v2/dico"
                'xmlns:ent': "http://www.edf.fr/commerce/passerelle/commun/v2" +
                "/entete"
                'xmlns:msg': "http://www.edf.fr/commerce/passerelle/css/" +
                "visualiserAccordCommercial/service/v2"
                'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance"
                'xsi:schemaLocation': "http://www.edf.fr/commerce/passerelle/" +
                "css/visualiserAccordCommercial/service/" +
                "v2 visualiserAccordCommercial.xsd"

            'msg:enteteEntree':
                'ent:jeton': data.edfToken

            'msg:corpsEntree':
                'msg:numeroBp': entries.client[0].clientId
                'msg:numeroAcc': entries.client[0].numeroAcc


    edfRequestPost path, body, (err, result) ->
        return callback err if err
        try
            acoElem = getF result["ns:msgReponse"], "ns:corpsSortie", \
                "ns:listeAccordCommerciaux", "ns:acordcommercial"

            paymentTerms =
                vendor: 'EDF'
                clientId: entries.client[0].clientId
                docTypeVersion: K.docTypeVersion

            paymentTerms.bankDetails =
                iban: getF(acoElem, 'ns:banque', 'ns:iban')
                holder: getF(acoElem, 'ns:compte', 'ns:titulaire')
                bank: getF(acoElem, "ns:banque", "ns:nom")

            bankAddress =
                street: getF(acoElem, 'ns:banque', 'ns:numNomRue')
                city: getF(acoElem, 'ns:banque', 'ns:codePostalVille')
                # postcode ?
                country: getF(acoElem, 'ns:banque', 'ns:pays')

            bankAddress.formated = "#{bankAddress.street}" +
                "\n#{bankAddress.city} #{bankAddress.country}"
            paymentTerms.bankDetails.bankAddress = bankAddress

            paymentTerms.balance = getF acoElem, 'ns:detail', 'ns:solde'
            paymentTerms.paymentMeans = getF acoElem, 'ns:detail'
            , 'ns:modeEncaissement'
            paymentTerms.modifBankDetailsAllowed = getF acoElem, 'ns:detail'
            , 'ns:modifIbanAutorisee'
            #accountNumber: getF acoElem, 'ns:detail', 'ns:numeroEtendu'
            paymentTerms.dernierReglement =
                    date: getF acoElem, 'ns:dernierReglement', 'ns:date'
                    amount: getF acoElem, 'ns:dernierReglement', 'ns:montant'
                    type: getF acoElem, 'ns:dernierReglement', 'ns:type'
            paymentTerms.billFrequency = getF acoElem, 'ns:facturation', \
                                    'ns:periodicite'
            paymentTerms.nextBillDate = getF acoElem
                , 'ns:facturation', 'ns:dateProchaineFacture'

            paymentTerms.idPayer = getF acoElem, 'ns:numeroPayeur'
            paymentTerms.payerDivergent = getF acoElem, 'ns:payeurDivergent'

            servicesElem = acoElem['ns:services']
            services = servicesElem.map (serviceElem) ->
                service = {}
                service.name = getF serviceElem, 'ns:nomService'
                service.status = getF serviceElem, 'ns:etat'
                service.valeurSouscrite = getF serviceElem, 'ns:valeurSouscrite'
                service.valeurPossibles = serviceElem['ns:valeursPossibles']

                return service


            entries.paymentterms.push paymentTerms
            entries.contract.forEach (contract) ->
                contract.services = contract.services.concat services

            K.logger.info "Fetched visualiserAccordCommercial."
            callback()

        catch e
            K.logger.error "While fetching visualiserAccordCommercial."
            K.logger.error e
            callback e


fetchVisualiserCalendrierPaiement = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchVisualiserCalendrierPaiement"
    path = '/ws/visualiserCalendrierPaiement_rest_V2-0/invoke'
    body =
        'message:msgRequete':
            '$':
                'xsi:schemaLocation': "http://www.edf.fr/commerce/passerelle/" +
                "css/visualiserCalendrierPaiement/service/v2 C:\\HMN\\" +
                "EDFMoiV2\\WSDL\\passerelle\\passerelle\\css\\" +
                "visualiserCalendrierPaiement\\service\\v2\\" +
                "visualiserCalendrierPaiement.xsd"
                'xmlns:message': "http://www.edf.fr/commerce/passerelle/css/" +
                "visualiserCalendrierPaiement/service/v2"
                'xmlns:ent': "http://www.edf.fr/commerce/passerelle/commun/" +
                "v2/entete"
                'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance"

            'message:enteteEntree':
                'ent:jeton': data.edfToken

            'message:corpsEntree':
                'message:numeroBp': entries.client[0].clientId
                'message:numeroAcc': entries.client[0].numeroAcc

    edfRequestPost path, body, (err, result) ->
        return callback err if err
        try
            listeEcheances = getF(result["ns:msgReponse"], "ns:corpsSortie", \
                "ns:calendrierDePaiement")["ns:listeEcheances"]

            # TODO : if no gaz and elec !?
            paymentSchedules = listeEcheances.map (echeance) ->
                amountGaz = parseFloat getF echeance, "ns:montantGaz"
                amountElec = parseFloat getF echeance, "ns:montantElec"

                if isNaN amountGaz then amountGaz = 0
                if isNaN amountElec then amountElec = 0

                doc =
                    number: parseInt getF echeance, "ns:numeroEcheance"
                    receiptDate: getF echeance, "ns:dateEncaissement"
                    scheduleDate: getF echeance, "ns:DateEcheance"
                    paid: getF(echeance, "ns:paiement") is 'EFFECTUE'
                    amount: amountGaz + amountElec
                    amountGas: amountGaz
                    amountElectricity: amountElec
                return doc

            unless entries.paymentterms[0]
                entries.paymentterms[0] =
                    vendor: 'EDF'
                    clientId: entries.client[0].clientId
                    docTypeVersion: K.docTypeVersion

            entries.paymentterms[0].paymentSchedules = paymentSchedules
            K.logger.info "Fetched #{paymentSchedules.length} " +
            "from fetchVisualiserCalendrierPaiement"
            callback()

        catch e
            K.logger.error "While fetchVisualiserCalendrierPaiement"
            K.logger.error e
            callback e

fetchRecupereDocumentContractuelListx = (reqFields, entries, data, callback) ->
    K.logger.info "fetchRecupereDocumentContractuelListx"
    path = '/ws/recupererDocumentContractuelListx_rest_V1-0/invoke'
    body =
        'ns:msgRequete':
            '$':
                'xmlns:dicoPAS': "http://www.edf.fr/commerce/passerelle/" +
                "commun/v2/dico"
                'xmlns:dico': "http://www.edf.fr/psc/pscmaxsd/commun/v1/dico"
                'xmlns:ns': "http://www.edf.fr/commerce/passerelle/psc/" +
                "recupererDocumentContractuelListx/service/v1"
                'xmlns:ent': "http://www.edf.fr/commerce/passerelle/commun/" +
                "v2/entete"

            'ns:jeton': data.edfToken
            'ns:options': [
                'ns:cle': 'id'
                'ns:valeur': 'pscedfmoi'
            ,
                'ns:cle': 2
                'ns:valeur': entries.client[0].clientId
            ,
                'ns:cle': 6
                'ns:valeur': 'Facture'
            ]

    edfRequestPost path, body, (err, result) ->
        return callback err if err

        bills = []
        try
            documents = result["ns:msgReponse"]["ns:docubase"][0]["ns:document"]

            bills = documents.map (elem) ->
                bill =
                    vendor: 'EDF'
                    clientId: entries.client[0].clientId
                    docTypeVersion: K.docTypeVersion

                date = moment getF(elem, 'ns:datecre'), 'YYYYMMDD'
                bill.date = date.format 'YYYY-MM-DD'

                for option in elem['ns:category']
                    key = getF option, 'ns:id'
                    value = getF option, 'ns:valeur'

                    switch key
                        when '4' then bill.number = value
                        when '7' then bill.amount = Number value

                return bill

            entries.bill = bills
            K.logger.info "Fetched #{bills.length} bills"
            callback()
        catch e
            K.logger.error "While fetchRecupereDocumentContractuelListx"
            K.logger.error e
            callback e

fetchVisualiserHistoConso = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchVisualiserHistoConso"
    async.mapSeries entries.contract, (contract, cb) ->
        path = '/ws/visualiserHistoConso_rest_V3-0/invoke'
        body =
            'message:msgRequete':
                '$':
                    'xsi:schemaLocation': "http://www.edf.fr/commerce/" +
                    "passerelle/css/visualiserHistoConso/service/v2 C:\\HMN" +
                    "\\EDFMoiV2\\WSDL\\passerelle\\passerelle\\css" +
                    "\\visualiserHistoConso\\service\\v2\\" +
                    "visualiserHistoConso.xsd"
                    'xmlns:message': "http://www.edf.fr/commerce/passerelle/" +
                    "css/visualiserHistoConso/service/v2"
                    'xmlns:ent': "http://www.edf.fr/commerce/passerelle/" +
                    "commun/v2/entete"
                    'xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance"

                'message:enteteEntree':
                    'ent:jeton': data.edfToken

                'message:corpsEntree':
                    'message:numeroBp': entries.client[0].clientId
                    'message:numeroContrat': contract.number

        edfRequestPost path, body, (err, result) ->
            return callback err if err

            try
                unless "ns:corpsSortie" of result["ns:msgReponse"]
                    K.logger.info "No histoConsos to fetch"
                    return callback null, []

                consoElems = result["ns:msgReponse"]["ns:corpsSortie"][0]\
                    ["ns:listeHistoDeConso"]

                res = consoElems.map (consoElem) ->
                    doc =
                        contractNumber: contract.number
                        billNumber: getF consoElem, 'ns:numeroFacture'
                        start: getF consoElem, 'ns:dateDebut'
                        end: getF consoElem, 'ns:dateFin'
                        value: getF consoElem, 'ns:listeConsommation'
                        , 'ns:valeur'
                        # unit: getF conso, 'ns:listeConsommation', 'ns:cadran'
                        statementType: getF consoElem, 'ns:typeReleve'
                        statementCategory: getF consoElem, 'ns:categorieReleve'
                        statementReason: getF consoElem, 'ns:motifReleve'
                        docTypeVersion: K.docTypeVersion

                    return doc

                cb null, res
            catch e
                K.logger.error "While fetching visualiserHistoConso."
                K.logger.error e
                cb e

    , (err, results) ->
        return callback err if err

        entries.consumptionstatement = results.reduce (agg, result) ->
            return agg.concat result
        , []

        K.logger.info "Fetched #{entries.consumptionstatement.length}"+
            " consumptionStatements"
        callback()


fetchPDF = (token, client, billNumber, callback) ->
    K.logger.info "fetchPDF"

    path = '/ws/recupererDocumentContractuelGet_rest_V1-0/invoke'
    body =
        'ns:msgRequete':
            '$':
                'xmlns:dicoPAS': "http://www.edf.fr/commerce/passerelle/" +
                "commun/v2/dico"
                'xmlns:dico': "http://www.edf.fr/psc/pscmaxsd/commun/v1/dico"
                'xmlns:ns': "http://www.edf.fr/commerce/passerelle/psc/" +
                "recupererDocumentContractuelGet/service/v1"
                'xmlns:ent': "http://www.edf.fr/commerce/passerelle/commun/" +
                "v2/entete"

            'ns:jeton': token
            'ns:options': [
                'ns:cle': 'id'
                'ns:valeur': 'pscedfmoi'
            ,
                'ns:cle': 2
                'ns:valeur': client.clientId
            ,
                'ns:cle': 4
                'ns:valeur': billNumber
            ,
                'ns:cle': 6
                'ns:valeur': 'Facture'
            ]

    edfRequestPost path, body, (err, result) ->
        return callback err if err
        K.logger.info "pdf fetched"
        base64PDF = getF result['ns:msgReponse'], \
                    'ns:docubase', 'ns:documentPDF', 'ns:pdf'
        callback null, base64PDF


##
# Edelia
##

fetchEdeliaToken = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchEdeliaToken"
    request.post 'https://api.edelia.fr/' + 'authorization-server/oauth/token',
        form:
            client_id: requiredFields.edeliaClientId
            grant_type: 'edf_sso'
            jeton_sso: data.edfToken
            bp: entries.client[0].clientId
            # TODO : one procedure per contract !!!
            pdl: entries.contract[0].pdl
        json: true
    , (err, response, result) ->
        if err
            K.logger.error 'While fetching edelia token.'
            K.logger.error err
            return callback err

        K.logger.info 'Fetched edelia token'
        data.edeliaToken = result.access_token
        data.contract = entries.contract[0]
        callback()


fetchEdeliaProfile = (requiredFields, entries, data, callback) ->
    K.logger.info "fetchEdeliaMonthlyProfile"
    getEdelia data.edeliaToken, '/sites/-/profiles/simple?ts=' +
    new Date().toISOString(), (err, response, obj) ->
        error = null
        try
            err = 'no result' if not err and not obj

            if err
                K.logger.error 'While fetchEdeliaProfile'
                K.logger.error err
                throw err

            if obj.errorCode and obj.errorCode is "403"
                data.noEdelia = true
                K.logger.warn "No edelia: #{obj.errorDescription}"
                throw null

            doc =
                pdl: data.pdl
                beginTs: obj.beginTs
                isProfileValidated: obj.isProfileValidated
                housingType: obj.housingType
                residenceType: obj.residenceType
                occupationType: obj.occupationType
                constructionDate: obj.constructionDate
                isBBC: obj.isBBC
                surface: obj.surfaceInSqMeter
                occupantsCount: obj.noOfOccupants
                principalHeatingSystemType: obj.principalHeatingSystemType
                sanitoryHotWaterType: obj.sanitoryHotWaterType
                docTypeVersion: K.docTypeVersion

            entries.home.push doc
            K.logger.info 'Fetched fetchEdeliaProfile'

        catch e
            error = e
        finally
            callback error


##
# Edelia electricite
##

fetchEdeliaMonthlyElecConsumptions = (
requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia

    K.logger.info "fetchEdeliaMonthlyElecConsumptions"
    getEdelia data.edeliaToken, "/sites/-/monthly-elec-consumptions?" +
    "begin-month=2012-01&" +
    "end-month=#{moment().add(1, 'month').format('YYYY-MM')}&ended=false"
    , (err, response, obj) ->

        error = null
        try
            if response.statusCode is 404 or response.statusCode is 500
                K.logger.warn 'No EdeliaMonthlyElecConsumptions'
                data.noElec = true
                throw null

            if err
                K.logger.error 'Wihle fetchEdeliaMonthlyElecConsumptions'
                K.logger.error err
                throw callback err

            statements = []

            data.consumptionStatementByMonth = {}

            statements = statements.concat obj.monthlyElecEnergies.map (mee) ->
                doc =
                    docTypeVersion: K.docTypeVersion
                    contractNumber: data.contract.number
                    start: mee.beginDay
                    end: mee.endDay
                    value: mee.consumption.energy
                    statementType: 'estime'
                    statementCategory: 'edelia'
                    statementReason: 'EdeliaMonthlyElecConsumption'
                    period: mee.month
                    cost: mee.totalCost
                    costsByCategory: mee.consumption.costsByTariffHeading
                    valuesByCatergory: mee.consumption.energiesByTariffHeading

                doc.costsByCategory.standing = mee.standingCharge
                data.consumptionStatementByMonth[mee.month] = doc

                return doc

            # Convenient structure to enhance data later.
            data.consumptionStatementByYear = {}

            statements = statements.concat obj.yearlyElecEnergies.map (yee) ->
                doc =
                    docTypeVersion: K.docTypeVersion
                    contractNumber: data.contract.number
                    start: yee.beginDay
                    end: yee.endDay
                    value: yee.consumption.energy
                    statementType: 'estime'
                    statementCategory: 'edelia'
                    statementReason: 'EdeliaYearlyElecConsumption'
                    period: yee.year
                    cost: yee.totalCost
                    costsByCategory: yee.consumption.costsByTariffHeading
                    valuesByCatergory: yee.consumption.energiesByTariffHeading

                doc.costsByCategory.standing = yee.standingCharge

                # Add to a convenient structure to enhance them with comparisons
                data.consumptionStatementByYear[yee.year] = doc
                return doc

            if statements.length isnt 0
                entries.consumptionstatement = entries
                    .consumptionstatement.concat statements

            K.logger.info 'Fetched fetchEdeliaMonthlyElecConsumptions'

        catch e
            error = e
        finally
            callback error


fetchEdeliaSimilarHomeYearlyElecComparisions = (
requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia or data.noElec

    K.logger.info "fetchEdeliaSimilarHomeYearlyElecComparisions"
    getEdelia data.edeliaToken
    , "/sites/-/similar-home-yearly-elec-comparisons?begin-year=2012"
    , (err, response, objs) ->
        error = null
        try
            if response.statusCode is 404 or response.statusCode is 500
                K.logger.warn 'No EdeliaSimilarHomeYearlyElecComparisions'
                data.noElec = true
                throw null
            if err
                K.logger.error(
                    'While fetchEdeliaSimilarHomeYearlyElecComparisions')
                K.logger.error err
                throw err

            objs.forEach (obj) ->
                # if ...
                statement = data.consumptionStatementByYear[obj.year]
                statement.similarHomes =
                    site: obj.energies.site
                    average: obj.energies.similarHomes.SH_AVERAGE_CONSUMING
                    least: obj.energies.similarHomes.SH_LEAST_CONSUMING

            K.logger.info 'Fetched fetchEdeliaSimilarHomeYearlyElecComparisions'
        catch e
            error = e
        finally
            callback error

        delete data.consumptionStatementByYear
        callback()

fetchEdeliaElecIndexes = (requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia or data.noElec
    K.logger.info "fetchEdeliaElecIndexes"
    getEdelia data.edeliaToken
    , "/sites/-/elec-indexes?begin-date=2012-01-01&" +
    "end-date=#{moment().format('YYYY-MM-DD')}&types="
    , (err, response, objs) ->

        error = null
        try
            if response.statusCode is 404
                K.logger.warn 'No EdeliaElecIndexes'
                throw null

            if err
                K.logger.error 'Wihle fetchEdeliaElecIndexes'
                K.logger.error err
                throw callback err

            objs.forEach (obj) ->
                statement = data
                    .consumptionStatementByMonth[obj.date.slice(0, 7)]

                statement.statements = statement.statements || []
                statement.statements.push obj

            K.logger.info 'Fetched fetchEdeliaElecIndexes'
        catch e
            error = e
        finally
            callback error

        delete data.consumptionStatementByMonth
        callback()

##
# Edelia Gas
##

fetchEdeliaMonthlyGasConsumptions = (requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia
    K.logger.info "fetchEdeliaMonthlyGasConsumptions"
    getEdelia data.edeliaToken
    , "/sites/-/monthly-gas-consumptions?begin-month=2012-01&" +
    "end-month=#{moment().add(1, 'month').format('YYYY-MM')}&ended=false"
    , (err, response, obj) ->

        error = null
        try
            if response.statusCode is 404
                K.logger.warn 'No EdeliaMonthlyGasConsumptions'
                data.noGas = true
                throw null

            if err
                K.logger.error 'Wihle fetchEdeliaMonthlyGasConsumptions'
                K.logger.error err
                throw err

            statements = []

            data.consumptionStatementByMonth = {}

            statements = obj.monthlyGasEnergies?.map (mee) ->
                doc =
                    docTypeVersion: K.docTypeVersion
                    contractNumber: data.contract.number
                    start: mee.beginDay
                    end: mee.endDay
                    value: mee.consumption.energy
                    statementType: 'estime'
                    statementCategory: 'edelia'
                    statementReason: 'EdeliaMonthlyGasConsumption'
                    period: mee.month
                    cost: mee.totalCost
                    costsByCategory:
                        consumption: mee.consumption.cost
                        standing: mee.standingCharge

                data.consumptionStatementByMonth[mee.month] = mee
                return doc

            # Convenient structure to enhance data later.
            data.consumptionStatementByYear = {}

            statements = statements.concat obj.yearlyGasEnergies.map (yee) ->
                doc =
                    docTypeVersion: K.docTypeVersion
                    contractNumber: data.contract.number
                    start: yee.beginDay
                    end: yee.endDay
                    value: yee.consumption.energy
                    statementType: 'estime'
                    statementCategory: 'edelia'
                    statementReason: 'EdeliaYearlyGasConsumption'
                    period: yee.year
                    cost: yee.totalCost
                    costsByCategory:
                        consumption: yee.consumption.cost
                        standing: yee.standingCharge

                # Add to a convenient structure to enhance them with comparisons
                data.consumptionStatementByYear[yee.year] = doc
                return doc

            if (statements.length isnt 0)
                entries.consumptionstatement = entries
                .consumptionstatement.concat statements

            K.logger.info 'Fetched fetchEdeliaMonthlyGasConsumptions'

        catch e
            error = e
        finally
            callback error

fetchEdeliaSimilarHomeYearlyGasComparisions = (
requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia or data.noGas

    K.logger.info "fetchEdeliaSimilarHomeYearlyGasComparisions"
    getEdelia data.edeliaToken
    , "/sites/-/similar-home-yearly-gas-comparisons?begin-year=2012"
    , (err, response, objs) ->

        error = null
        try
            if response.statusCode is 404 or response.statusCode is 500
                K.logger.warn 'No EdeliaSimilarHomeYearlyGasComparisions'
                throw null

            if err
                K.logger.error(
                    'While fetchEdeliaSimilarHomeYearlyGasComparisions')
                K.logger.error err
                throw err

            objs.forEach (obj) ->
                # if ...
                statement = data.consumptionStatementByYear[obj.year]
                statement.similarHomes =
                    site: obj.energies.site
                    average: obj.energies.similarHomes.SH_AVERAGE_CONSUMING
                    least: obj.energies.similarHomes.SH_LEAST_CONSUMING

            K.logger.info 'Fetched fetchEdeliaSimilarHomeYearlyGasComparisions'
        catch e
            error = e
        finally
            callback error
        callback()

fetchEdeliaGasIndexes = (requiredFields, entries, data, callback) ->
    return callback() if data.noEdelia or data.noGas

    K.logger.info "fetchEdeliaGasIndexes"
    getEdelia data.edeliaToken
    , "/sites/-/gas-indexes?begin-date=2012-01-01&" +
    "end-date=#{moment().format('YYYY-MM-DD')}&types="
    , (err, response, objs) ->

        error = null
        try
            if response.statusCode is 404
                K.logger.warn 'No EdeliaGasIndexes'
                throw null

            if err
                K.logger.error 'Wihle fetchEdeliaGasIndexes'
                K.logger.error err
                throw callback err

            objs.forEach (obj) ->
                statement = data
                    .consumptionStatementByMonth[obj.date.slice(0, 7)]

                statement.statements = statement.statements || []
                statement.statements.push obj

            K.logger.info 'Fetched fetchEdeliaGasIndexes'
        catch e
            error = e
        finally
            callback error
        callback()

##


prepareEntries = (requiredFields, entries, data, next) ->
    entries.home = []
    entries.consumptionstatement = []
    entries.contract = []
    entries.bill = []
    entries.client = []
    entries.paymentterms = []
    next()
###
updateOrCreateDocs = (requiredFields, entries, data, next) ->
    async.series [
        (cb) ->
            updateOrCreate [entries.client], ['clientId', 'vendor'], Client, cb
        (cb) ->
            updateOrCreate entries.contracts, ['number', 'vendor'], Contract, cb
        (cb) ->
            updateOrCreate [entries.paymentTerms]
                , ['vendor', 'clientId'], PaymentTerms, cb

        (cb) -> updateOrCreate entries.homes, ['pdl'], Home, cb
        (cb) ->
            updateOrCreate entries.consumptionStatements
            , ['contractNumber', 'statementType', 'statementReason'
            , 'statementCategory', 'start'],
            ConsumptionStatement, cb
        (cb) ->
            updateOrCreate entries.bills, ['vendor', 'number'], Bill, cb
        (cb) ->
            saveMissingBills requiredFields, entries, data, cb
    ], next

updateOrCreate = (entries, filter, docType, callback) ->
    return callback() if not entries or entries.length is 0

    docType.all (err, docs) ->
        return callback err if err

        async.eachSeries entries, (entry, cb) ->
            toUpdate = docs.find (doc) ->
                for k in filter
                    if doc[k] isnt entry[k]
                        return false
                return true

            if toUpdate
                toUpdate.updateAttributes entry, cb
            else
                docType.create entry, cb

        , callback
###


createNewFile = (data, file, callback) ->
    attachBinary = (newFile) ->

        # Here file is a stream. For some weird reason, request-json requires
        # that a path field should be set before uploading.
        file.path = data.name
        newFile.attachBinary file, {"name": "file"}, (err, res, body) ->
            upload = false
            if err
                newFile.destroy (error) ->
                    callback "Error attaching binary: #{err}"
            else
                callback null, newFile

    # Create file document then attach file stream as binary to that file
    # document.
    File.create data, (err, newFile) ->
        if err
            callback new Error "Server error while creating file; #{err}"
        else
            attachBinary newFile


saveMissingBills = (requiredFields, entries, data, callback) ->
    Bill.all (err, bills) ->
        async.eachSeries bills, (bill, cb) ->
            return cb() if ((bill.vendor isnt 'EDF') or bill.fileId)

            fetchPDF data.edfToken, entries.client[0], bill.number
            , (err, base64String) ->
                binaryBill = new Buffer base64String, 'base64'

                file = new File
                    name: "#{bill.date.toISOString().slice(0, 7)}-factureEDF.pdf"
                    mime: "application/pdf"
                    creationDate: new Date().toISOString()
                    lastModification: new Date().toISOString()
                    class: "document"
                    path: requiredFields.folderPath
                    size: binaryBill.length

                createNewFile file, binaryBill, (err, file) ->
                    return callback err if err
                    bill.updateAttributes
                        fileId: file._id
                        binaryId: file.binary?.file.id
                    , cb
        , callback



displayData = (requiredFields, entries, data, next) ->
    K.logger.info "display data"
    K.logger.info JSON.stringify entries, null, 2
    K.logger.info JSON.stringify data, null, 2

    next()

# Konnector
K = module.exports = require('../lib/base_konnector').createNew
    name: 'EDF'
    slug: 'edf'
    description: 'konnector description edf'
    vendorLink: 'https://particulier.edf.fr/fr'

    fields:
        email: 'text'
        password: 'password'
        folderPath: 'folder'

        # TODO : get one edeliaClientId: 'text'

    models: [Client, Contract, PaymentTerms, Home, ConsumptionStatement, Bill]

    # Define model requests !
    init: (callback) ->
        async.each [Client, Contract, PaymentTerms, Home, ConsumptionStatement]
        , (docType, cb) ->
            docType.defineRequest 'all', cozydb.defaultRequests.all, cb
        , (err) ->
            if err
                @logger.error err

    fetchOperations: [
        prepareEntries

        getEDFToken
        fetchListerContratClientParticulier
        fetchVisualiserPartenaire
        fetchVisualiserAccordCommercial
        fetchVisualiserCalendrierPaiement
        fetchRecupereDocumentContractuelListx
        fetchVisualiserHistoConso

        # Deactivate Edelia, while clientId isn't ready.
        #fetchEdeliaToken
        #fetchEdeliaProfile
        #fetchEdeliaMonthlyElecConsumptions
        #fetchEdeliaSimilarHomeYearlyElecComparisions
        #fetchEdeliaElecIndexes
        #fetchEdeliaMonthlyGasConsumptions
        #fetchEdeliaSimilarHomeYearlyGasComparisions
        #fetchEdeliaGasIndexes

        updateOrCreate logger, Client, ['clientId', 'vendor']
        updateOrCreate logger, Contract, ['number', 'vendor']
        updateOrCreate logger, PaymentTerms, ['vendor', 'clientId']
        updateOrCreate logger, Home, ['pdl']
        updateOrCreate logger, ConsumptionStatement, ['contractNumber',
            'statementType', 'statementReason', 'statementCategory', 'start']
        updateOrCreate logger, Bill, ['vendor', 'number']
        saveMissingBills
        #displayData
    ]

# Helpers

_extend = (a, b) ->
    for k, v of b
        if v?
            a[k] = v
    return a

getF = (node, fields...) ->
    try
        for field in fields
            node = node[field][0]
    catch e
        return null

    return node

translate = (dict, name) ->
    if name of dict
        return dict[name]
    return name

edfRequestPost = (path, body, callback) ->
    K.logger.debug "called edfRequestPost"
    xmlBody = builder.buildObject body
    request
        url: 'https://rce-mobile.edf.com' + path
        method: 'POST'
        # TODO : fix SSL3_GET_RECORD:wrong version number
        #agentOption: securityOptions: 'TLSv1_method'
        agentOption: securityOptions: 'SSLv3_method'
        headers:
            # Server needs Capitalize headers, and request use lower case...
            'Host': 'rce-mobile.edf.com'
            'Content-Type': 'application/xml'
            'Authorization': 'Basic ' +
                'QUVMTU9CSUxFX0FuZHJvaWRfVjE6QUVMTU9CSUxFX0FuZHJvaWRfVjE='
            'Accept-Encoding': 'gzip'
            'Content-Length': xmlBody.length
        body: xmlBody
        gzip: true
    , (err, response, data) ->
        K.logger.error JSON.stringify(err) if err
        return callback err if err
        parser.parseString data, (err, result) ->
            return callback err if err
            errorCode = getF result['ns:msgReponse'], \
                        'ns:enteteSortie', 'ent:codeErreur'

            if errorCode is '0' # means success.
                errorCode = null

            callback errorCode, result


getEdelia = (accessToken, path, callback) ->
    request.get 'https://api.edelia.fr/authorization-proxy/api/v1/' + path
    ,
        auth: bearer: accessToken
        json: true
    , callback
