import { Ditto, init } from "@dittolive/ditto";
import diff from "microdiff";

// The ditto instance needs to remain in scope of the application to ensure it doesn't get
// cleaned up.
let ditto;

// We'll only load Ditto once the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize a new Ditto instance
  // Update the appID & token with your Ditto App specific information found in the Ditto portal
  // For more information see https://docs.ditto.live/get-started/sync-credentials
  await init();
  ditto = new Ditto({
    type: "onlinePlayground",
    appID: "0fab7e5b-3d91-422d-b3e8-4ac6125c3b1e", // Add your Ditto App ID
    token: "525817b6-274f-43f2-b03e-4f1396030f0c", // Add your Ditto Playground Token
  });

  ditto.disableSyncWithV3();

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
  // When an event fires we'll re-render only the changed items using a differ strategy
  let prevResultItems = {};
  ditto.store.registerObserver("SELECT * FROM colors WHERE isDeleted = false", (result) => {
    
    const newResultItems = result.items.reduce((acc, item, index) => {
      acc[item.value._id.toString()] = item.value;
      return acc;
    }, {});
    // We'll start by diffing the current from the previous to see if there are any changes
    const diffResult = diff(prevResultItems, newResultItems)
    diffResult.forEach(docDiff => {
      // Remove only items that have changed and we'll re-add them
      const list = document.getElementById('colorList');
      // path[0] is set to the document _id which we use as the unique element id
      const docId = docDiff.path[0];
      console.log("DOCID:" + docId);
      switch (docDiff.type) {
        case 'CREATE':
          console.log(`New Document: '${docId}' with value '${JSON.stringify(docDiff.value)}'.`);
          generateColorItemAndAddItToTheList(docDiff.value)
          break;
        case 'CHANGE':
          const pathStr = docDiff.path.slice(1).join('.');
          console.log(`Changed Document: ['${docId}'] with path ['${pathStr}'] from '${docDiff.previous}' to '${docDiff.value}'.`);
          
          const itemToChange = document.getElementById(docId);
          itemToChange.style.color = docDiff.value;
          itemToChange.textContent = docDiff.value;
          // // Get the current item 
          // const childToRemove = document.getElementById(docId);
          // // Generate the new item
          // const newListItem = generateColorItem(docDiff.value);
          // // Insert the new item after
          // childToRemove.insertBefore(newListItem, childToRemove.nextSibling)
          // // Remove old item
          // list.removeChild(childToRemove)
          break;
        case 'REMOVE':
          console.log(`Removed Document: '${docId}' which had value '${JSON.stringify(docDiff.previous)}'.`);
          // The delete button already cleans up the element but we'll add this check to make sure it's gone
          const childItemToRemove = document.getElementById(docId.toString());
          if (childItemToRemove) {
            list.removeChild(childItemToRemove);
          } else {
            console.log("item already deleted");
          }
          break
        default:
          break;
    }})

    prevResultItems = newResultItems;
  });

  // Get the generate color button and add an event handler for a click action
  const button = document.getElementById('generateColorButton');
  button.addEventListener('click', () => {
    // Create a new color document to be added to the colors collection
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
  function generateColorItemAndAddItToTheList(colorDoc) {
      // Remove only items that have changed and we'll re-add them
      const list = document.getElementById('colorList');
      const listItem = generateColorItem(colorDoc)
      list.appendChild(listItem);
  }
});

// Creates a new Color Item
function generateColorItem(colorDoc) {
  const list = document.getElementById('colorList');
  const listItem = document.createElement('li');
  const colorText = document.createElement('span');
  colorText.style.color = colorDoc.color;
  colorText.textContent = colorDoc.color;
  colorText.style.marginRight = '10px';
  colorText.setAttribute('id', colorDoc._id);
  
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

  // create a delete button for the color list item
  const changeColorButton = document.createElement('button');
  changeColorButton.textContent = 'Change Color';
  changeColorButton.addEventListener('click', () => {
    // Set the deleted property to true for the id selected
    const newColor = generateRandomColor();
    ditto.store.execute(`
      UPDATE colors
      SET color = '${newColor}'
      WHERE _id = :id`, { id: colorDoc._id });
  });

  listItem.appendChild(colorText);
  listItem.appendChild(changeColorButton);
  listItem.appendChild(deleteButton);
  return listItem;
}

// Generates a random hex color
function generateRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}