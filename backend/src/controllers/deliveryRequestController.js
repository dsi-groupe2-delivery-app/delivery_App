const DeliveryRequest = require("../models/DeliveryRequest");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../config/email");
// envoyer demande d'inscription 
exports.submitRequest = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone } = req.body;

    // Vérifier si l'email existe déja
const existingUser = await User.findOne({ email });

if (existingUser && existingUser.role !== "client") {
  return res.status(409).json({
    message: "Cet email appartient déjà à un livreur.",
  });
}

    // Vérifier si une demande est déjà en attente
    const existingRequest = await DeliveryRequest.findOne({
      email,
      statut: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "Une demande avec cet email est déjà en attente.",
      });
    }

    // Créer la demande
    const demande = await DeliveryRequest.create({
      nom,
      prenom,
      email,
      telephone,
    });

    return res.status(201).json({
      message: "Votre demande a été envoyée avec succès.",
      demande,
    });
  } catch (error) {
    next(error);
  }
};

// Afficher toutes les demandes pour l'agent
exports.getAllRequests = async (req, res, next) => {
  try {
    const demandes = await DeliveryRequest.find().sort({
      dateDemande: -1,
    });

    res.render("admin-livreurs", { demandes });
  } catch (error) {
    next(error);
  }
};


exports.acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const demande = await DeliveryRequest.findOne({
      _id: id,
      statut: "pending",
    });

    if (!demande) {
      return res.status(404).json({
        message: "Demande introuvable ou déjà traitée.",
      });
    }
    const existingUser = await User.findOne({
  email: demande.email,
  role: "livreur",
});

if (existingUser) {
  return res.status(409).json({
    message: "Cet email appartient déjà à un livreur.",
  });
}

    const temporaryPassword = crypto
      .randomBytes(9)
      .toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    
    const livreur = await User.create({
      nom: demande.nom,
      prenom: demande.prenom,
      email: demande.email,
      telephone: demande.telephone,
      passwordHash,
      role: "livreur",
      actif: true,
      doitChangerMotDePasse: true,
    });

    demande.statut = "accepted";
    await demande.save();

  
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: demande.email,
        subject: "Votre demande de livraison est acceptée",
        text: `Bonjour ${demande.prenom},

Votre demande a été acceptée !

Voici vos identifiants :

Email : ${demande.email}
Mot de passe temporaire : ${temporaryPassword}

Veuillez changer votre mot de passe lors de votre première connexion.

Bienvenue dans notre équipe !`,
      });
    } catch (emailError) {
      await User.deleteOne({ _id: livreur._id });

      demande.statut = "pending";
      await demande.save();

      throw emailError;
    }

    return res.json({
      message: "Demande acceptée et email envoyé.",
    });

  } catch (error) {
    next(error);
  }
};



exports.rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const demande = await DeliveryRequest.findOne({
      _id: id,
      statut: "pending",
    });

    if (!demande) {
      return res.status(404).json({
        message: "Demande introuvable ou déjà traitée.",
      });
    }

    demande.statut = "rejected";
    await demande.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: demande.email,
        subject: "Réponse à votre demande de livraison",
        text: `Bonjour ${demande.prenom},

Nous vous remercions pour votre intérêt.

Malheureusement, votre demande pour devenir livreur n'a pas été retenue.

Merci pour votre compréhension.

Cordialement,
L'équipe.`,
      });
    } catch (emailError) {
      return res.status(502).json({
        message: "Demande refusée, mais l'email n'a pas pu être envoyé.",
      });
    }

    return res.json({
      message: "Demande refusée et email envoyé.",
    });

  } catch (error) {
    next(error);
  }
};
