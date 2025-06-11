; C:\manoj\server project\KYLE-PO-POS8\installer.nsh

; Request admin privileges at the global scope
RequestExecutionLevel admin

!macro customInit
  ; Initialize the plugins directory (this sets $PLUGINSDIR to a temporary directory)
  InitPluginsDir       

  ; Create a custom directory for extraction in the user's AppData folder
  CreateDirectory "$APPDATA\POS1Temp"

  ; Check if the directory was created successfully
  IfFileExists "$APPDATA\POS1Temp" +2 0
  MessageBox MB_OK|MB_ICONEXCLAMATION "Failed to create temporary directory. Please ensure you have write permissions in $APPDATA."
!macroend

!macro customInstall
  ; Ensure the installation directory is set
  SetOutPath "$INSTDIR"

  ; Since electron-builder handles file extraction, we can add custom installation steps here if needed
  ; For example, create additional directories or set permissions
  CreateDirectory "$INSTDIR\logs"
  CreateDirectory "$INSTDIR\backups"

  ; Log success or handle errors
  IfErrors 0 +2
  MessageBox MB_OK|MB_ICONEXCLAMATION "Error setting up installation directories. Please ensure you have enough disk space and write permissions."
!macroend

!macro customUnInit
  ; Clean up the custom temp directory after installation
  RMDir /r "$APPDATA\POS1Temp"
!macroend