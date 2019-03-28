const {
  APP_NAME,
  FULL_NAME_PERMISSION
} = require('../utils/constants')

const messages = require('../utils/messages')
const db = require('../db')

const PlaceOrderIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'PlaceOrderIntent';
  },
  async handle(handlerInput) {

    const { serviceClientFactory, responseBuilder } = handlerInput;
    try {
      const upsServiceClient = serviceClientFactory.getUpsServiceClient();
      const profileName = await upsServiceClient.getProfileName();
      const profileEmail = await upsServiceClient.getProfileEmail();
      const profileMobileObject = await upsServiceClient.getProfileMobileNumber();
      if (!profileEmail) {
        const noEmailResponse = `It looks like you don\'t have an email set. You can set your email from the companion app.`
        return responseBuilder
                      .speak(noEmailResponse)
                      .withSimpleCard(APP_NAME, noEmailResponse)
                      .getResponse();
      }
      if (!profileMobileObject) {
        const errorResponse = `It looks like you don\'t have a mobile number set. You can set your mobile number from the companion app.`
        return responseBuilder
          .speak(errorResponse)
          .withSimpleCard(APP_NAME, errorResponse)
          .getResponse();
      }
      const profileMobile = profileMobileObject.phoneNumber;

      // TODO save order to email
      // Checking if an order already exists

      // If an order does not exist
      if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED') {
        const orderCancelledResponse = `
          This order will not be created. You can ask me more about "Widget Pro", place an order or manage your existing order.
        `
        return responseBuilder
          .speak(orderCancelledResponse)
          .withSimpleCard(APP_NAME, orderCancelledResponse)
          .getResponse();
      } else if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED') {
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        const userID = handlerInput.requestEnvelope.context.System.user.userId; 
        const userInfo = {
          name: profileName,
          email: profileEmail,
          mobile: profileMobile
        }
        const shippingAddress = {
          streetName: slots.street.value, 
          city: slots.city.value,
          state: slots.state.value,
          postalCode: slots.zip.value
        }
        
        return db.addOrder(userID, userInfo, shippingAddress)
          .then((data) => {
            console.log('Order saved successfully', data)
            const orderSuccessfulResponse = 'The order has been placed successfully';
            return responseBuilder
              .speak(orderSuccessfulResponse)
              .getResponse();
          })
          .catch((err) => {
            console.log("Error occured while saving order", err);
            const orderNotSavedResponse = "We cannot create your right now. Please try again!"
            return responseBuilder
              .speak(orderNotSavedResponse)
              .getResponse();
          })
      }
      

      const speechResponse = 'Your order has been placed successfully'
      
      return responseBuilder
                      .speak(speechResponse)
                      .withSimpleCard(APP_NAME, speechResponse)
                      .getResponse();
    } catch (error) {
      console.log(JSON.stringify(error));
      if (error.statusCode == 403) {
        return responseBuilder
        .speak(messages.NOTIFY_MISSING_PERMISSIONS)
        .withAskForPermissionsConsentCard([FULL_NAME_PERMISSION])
        .getResponse();
      }
      console.log(JSON.stringify(error));
      const response = responseBuilder.speak(messages.ERROR).getResponse();
      return response;
    }
  },
}

module.exports = PlaceOrderIntentHandler;