var form = document.forms.connect;
var con = form.elements.connect;

con.onclick = function()
{
  console.log("name: "+form.elements.name.value+" room: "+form.elements.room.value);
}