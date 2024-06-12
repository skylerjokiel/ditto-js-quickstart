import { Ditto, init } from "@dittolive/ditto";

// The ditto instance needs to remain in scope of the application to ensure it doesn't get
// cleaned up.
let ditto;

// We'll only load Ditto once the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const button = document.getElementById('generateColorButton');
  const list = document.getElementById('colorList');

  // Initialize a new Ditto instance
  // Update the appID & token with your Ditto App specific information found in the Ditto portal
  // For more information see https://docs.ditto.live/get-started/sync-credentials
  await init();
  ditto = new Ditto({
    type: "onlinePlayground",
    appID: "YOUR_APP_ID", // Add your Ditto App ID
    token: "YOUR_PLAYGROUND_TOKEN", // Add your Ditto Playground Token
  });
  // This is required to ensure correct v3 to v4 migration.
  await ditto.disableSyncWithV3();

  // A sync subscription fetch all the documents in the colors collections devices/cloud
  //
  // New data that is synced from other devices will automatically put into the Ditto store and will trigger a
  // register observer event
  //
  // Syncing will only start once the `ditto.startSync()` method below is called
  ditto.sync.registerSubscription("SELECT * FROM colors");

  // This will enable Ditto's automatic data sync operation based on subscriptions
  // The Ditto cloud will automatically pull all data from the device once sync is started
  ditto.startSync();

  // Register a Ditto store observer that will look for change to the `colors` collection in the local Ditto store
  // Any local or remote changes will trigger this event
  // When an event fires we'll re-render the list of colors based on which ones are not deleted
  ditto.store.registerObserver("SELECT * FROM colors", (result) => {
    
    // Clear the list in the DOM and we'll reset them
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    // For each item in the result set only show the ones not deleted
    result.items.forEach(item => {
      const doc = item.value;
      if (!doc.isDeleted) 
        addColorToList(item.value)
    })
    console.log(result.items.length)
  });

  button.addEventListener('click', () => {
    // Create a new colors document to be added to the collection
    const newColorDoc = {
        color: generateRandomColor(),
        isDeleted: false
      };

    // Insert a new color document into the colors collection
    ditto.store.execute(`
      INSERT INTO colors
      DOCUMENTS (:newColorDoc)`,
      { newColorDoc },
    );
  });

  // Render the color value with a delete button in the list
  function addColorToList(colorDoc) {
      const listItem = document.createElement('li');
      const colorText = document.createElement('span');
      colorText.style.color = colorDoc.color
      colorText.textContent = colorDoc.color;
      colorText.style.marginRight = '10px';
      
      // create a delete button for the color list item
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        // Set the deleted property to true for the id selected
        ditto.store.execute(`
          UPDATE colors
          SET isDeleted = true
          WHERE _id = :id`, { id: colorDoc._id })  
        list.removeChild(listItem);
      });

      listItem.appendChild(colorText);
      listItem.appendChild(deleteButton);
      list.appendChild(listItem);
  }
});

// Generates a random hex color
function generateRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
